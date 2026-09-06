import { Redis } from '@upstash/redis'

const WINDOW_SECONDS = 60
const MAX_REQUESTS = 60

// Hard ceiling on how long a rate-limit check may take. Upstash is a network
// hop; if it hangs, the request behind it must not hang with it.
const REDIS_TIMEOUT_MS = 1500

export type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
  /** true when the check could not run (no client, error, timeout) and the
   *  request was allowed through unmetered. Callers may surface/ignore. */
  degraded?: boolean
}

// ── Guarded, lazy client construction ────────────────────────────────────────
// Constructing at module scope with `process.env.X!` meant a missing/invalid
// config threw at import time, and an unreachable host threw on every call —
// which surfaced as a 500 from every rate-limited route (the whole /api/v1
// surface). Construction is now lazy, guarded, and cached.
let redis: Redis | null = null
let redisUnavailable = false

// Circuit breaker. A dead host does not fail fast (the client retries, and DNS
// resolution alone burned ~1.5s per call in testing), so once Redis has failed
// repeatedly we stop calling it for a cooldown and allow requests through at
// zero cost. After the cooldown one request probes again, so real limiting
// resumes on its own the moment Redis is healthy — no deploy, no flag.
const FAILURE_THRESHOLD = 3
const COOLDOWN_MS = 30_000
let consecutiveFailures = 0
let circuitOpenUntil = 0

function recordFailure() {
  consecutiveFailures += 1
  if (consecutiveFailures >= FAILURE_THRESHOLD) circuitOpenUntil = Date.now() + COOLDOWN_MS
}
function recordSuccess() {
  consecutiveFailures = 0
  circuitOpenUntil = 0
}

let lastWarnAt = 0
function warn(reason: string, err?: unknown) {
  // Throttled so a sustained outage doesn't flood the logs on every request.
  const now = Date.now()
  if (now - lastWarnAt < 60_000) return
  lastWarnAt = now
  console.warn(`[rateLimit] degraded — allowing requests unmetered: ${reason}`, err ?? '')
}

function getRedis(): Redis | null {
  if (redis) return redis
  if (redisUnavailable) return null

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    redisUnavailable = true
    warn('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured')
    return null
  }

  try {
    redis = new Redis({ url, token })
    return redis
  } catch (err) {
    redisUnavailable = true
    warn('Redis client construction failed', err)
    return null
  }
}

/**
 * Fixed-window rate limiter backed by Upstash.
 *
 * FAILS OPEN. A cache problem is not a client error: if Redis is unconfigured,
 * unreachable, erroring, or slow, the request is allowed through (degraded:true)
 * and a throttled warning is logged. Real limiting resumes automatically as soon
 * as Redis is reachable again — no deploy needed.
 */
export async function rateLimit(
  key: string,
  windowSeconds: number = WINDOW_SECONDS,
  maxRequests: number = MAX_REQUESTS,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / windowSeconds)
  const reset = (window + 1) * windowSeconds

  // The answer we give whenever the check itself cannot be trusted.
  const allowUnmetered: RateLimitResult = {
    success: true,
    remaining: maxRequests,
    reset,
    degraded: true,
  }

  // Circuit open — skip the network entirely until the cooldown lapses.
  if (Date.now() < circuitOpenUntil) return allowUnmetered

  const client = getRedis()
  if (!client) return allowUnmetered

  const windowKey = `ratelimit:${key}:${window}`

  try {
    const count = await withTimeout(client.incr(windowKey))
    if (count === null) {
      recordFailure()
      warn(`incr timed out after ${REDIS_TIMEOUT_MS}ms`)
      return allowUnmetered
    }
    recordSuccess()

    if (count === 1) {
      // Best-effort TTL. A failure here only risks a stale key, never the request.
      withTimeout(client.expire(windowKey, windowSeconds * 2)).catch(() => {})
    }

    return {
      success: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      reset,
    }
  } catch (err) {
    recordFailure()
    warn('Redis unreachable or errored', err)
    return allowUnmetered
  }
}

/** Resolves to the operation's value, or null if it outruns the budget. */
function withTimeout<T>(op: Promise<T>): Promise<T | null> {
  // Swallow a late rejection so racing never produces an unhandled rejection.
  const guarded = op.catch((err) => {
    throw err
  })
  guarded.catch(() => {})

  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), REDIS_TIMEOUT_MS)
  })

  return Promise.race([guarded, timeout]).finally(() => clearTimeout(timer!))
}
