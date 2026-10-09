import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Daily Redis keep-alive (Vercel Cron, see vercel.json). Free Upstash
// databases are deleted after 14 days without traffic; one write + read a
// day keeps the paste-flow cache/draft store alive.
//
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fail-closed: deny on
// unset/empty env, missing header, or mismatch.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const stamp = new Date().toISOString()
  try {
    await redis.set('cron:redis-ping', stamp, { ex: 7 * 24 * 60 * 60 })
    const readBack = await redis.get<string>('cron:redis-ping')
    const ok = readBack === stamp
    console.log(`[cron/redis-ping] ${ok ? 'ok' : 'mismatch'} ${stamp}`)
    return NextResponse.json({ ok, stamp }, { status: ok ? 200 : 500 })
  } catch (err) {
    console.error('[cron/redis-ping] failed', err)
    return NextResponse.json({ ok: false, error: 'redis command failed' }, { status: 500 })
  }
}
