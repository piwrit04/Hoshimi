/**
 * 把 fixtures 演示账本写入 IndexedDB。
 * 用法：先起 dev（5177），再 `node scripts/seed-demo.mjs`
 *
 * 优先连桌面 Chrome 的 CDP（9224），这样远程看的就是同一份账本；
 * 连不上再临时起 headless。
 */
import { createServer } from 'vite'
import path from 'path'
import { spawn } from 'child_process'
import { createRequire } from 'module'

const root = path.resolve(import.meta.dirname, '..')
const BASE = process.env.HOSHIMI_DEV_URL || 'http://127.0.0.1:5177'
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const CDP = process.env.HOSHIMI_CDP || 'http://127.0.0.1:9224'

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})

let snap
try {
  const fixtures = await server.ssrLoadModule('/src/domain/fixtures.ts')
  snap = fixtures.buildFixtureSnapshot(new Date())
  console.log(`ok: fixture orders=${snap.orders.length} customers=${snap.customers.length}`)
} finally {
  await server.close()
}

async function loadPuppeteer() {
  const require = createRequire(path.join(root, 'package.json'))
  try {
    return require('puppeteer-core')
  } catch {
    console.log('installing puppeteer-core…')
    await new Promise((resolve, reject) => {
      const p = spawn('npm', ['install', '--no-save', 'puppeteer-core@24'], {
        cwd: root,
        stdio: 'inherit',
        shell: false,
      })
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`npm exit ${code}`))))
    })
    return require('puppeteer-core')
  }
}

const puppeteer = await loadPuppeteer()

let browser
let owned = false
try {
  browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null })
  console.log('ok: connected CDP', CDP)
} catch {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  })
  owned = true
  console.log('ok: launched headless chrome')
}

try {
  const page = await browser.newPage()
  const url = `${BASE}/#/dashboard?seedDemo=1`
  console.log('open', url)
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction(
    () => window.__HOSHIMI_SEEDED__ === true || window.__HOSHIMI_READY__ === true,
    { timeout: 30000 },
  )
  const seeded = await page.evaluate(async (snapshot) => {
    if (window.__HOSHIMI_SEEDED__) return true
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('hoshimi', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(snapshot, 'snapshot')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })
    return 'idb'
  }, snap)
  console.log('ok: seeded via', seeded === true ? 'app flag' : seeded)
} finally {
  if (owned) await browser.close()
  else browser.disconnect()
}
