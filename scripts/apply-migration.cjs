/**
 * 在可直连 Postgres 的环境执行：
 *   node scripts/apply-migration.cjs
 * 或设置 DATABASE_URL。本机沙箱若封了 5432，请到 Dashboard → SQL Editor 粘贴
 * supabase/migrations/20261010_ledger_snapshots.sql 执行。
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const root = path.join(__dirname, '..')
const sqlPath = path.join(root, 'supabase/migrations/20261010_ledger_snapshots.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')
const password = fs.readFileSync(path.join(root, '.secrets/supabase-db-password.txt'), 'utf8').trim()
const ref = 'kzuspfbwfnuffzidrzri'

const targets = process.env.DATABASE_URL
  ? [{ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }]
  : [
      { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres', password, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 },
      { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}`, password, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 },
    ]

;(async () => {
  let last
  for (const cfg of targets) {
    const client = new Client(cfg)
    try {
      await client.connect()
      await client.query(sql)
      console.log('migration applied')
      await client.end()
      process.exit(0)
    } catch (e) {
      last = e
      console.error('attempt failed:', e.message)
      try { await client.end() } catch {}
    }
  }
  console.error('All attempts failed. Run the SQL file in Supabase SQL Editor.')
  process.exit(1)
})()
