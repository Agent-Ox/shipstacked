// Read-only DB inventory: lists all PostgREST-exposed public tables (from the
// OpenAPI spec) + exact row counts for foundational tables. No writes.
//   node --env-file=.env.local --experimental-strip-types scripts/v2/inventory-db.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, key)

// 1. All exposed tables via the PostgREST OpenAPI spec
const spec = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }).then(r => r.json())
const tables = Object.keys(spec.definitions ?? {}).sort()
console.log(`\n=== PUBLIC TABLES EXPOSED (${tables.length}) ===`)
for (const t of tables) console.log(t)

// 2. Row counts for every table (HEAD count, exact)
console.log(`\n=== ROW COUNTS (all tables) ===`)
for (const t of tables) {
  const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true })
  console.log(`${String(count ?? (error ? 'ERR:' + error.message : '?')).padStart(8)}  ${t}`)
}
