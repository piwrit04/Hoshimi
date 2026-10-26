import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'node:http'
import puppeteer from 'puppeteer-core'

const root = path.resolve('dist')
const outDir = path.join(process.env.USERPROFILE, 'Documents', 'hoshimi-screenshots')
fs.mkdirSync(outDir, { recursive: true })
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  let p = decodeURIComponent(url.pathname)
  if (p === '/') p = '/index.html'
  const file = path.join(root, p)
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // SPA fallback
    const index = path.join(root, 'index.html')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    fs.createReadStream(index).pipe(res)
    return
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4178, '127.0.0.1', r))
const chrome =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})

async function shot(mode, name) {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((m) => {
    localStorage.setItem(
      'theme-storage',
      JSON.stringify({ state: { mode: m }, version: 0 }),
    )
    localStorage.setItem(
      'help-storage',
      JSON.stringify({ state: { lastSeenHighlightsVersion: '0.1.0' }, version: 0 }),
    )
  }, mode)
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('console.error', msg.text())
  })
  await page.goto('http://127.0.0.1:4178/#/components?seedDemo=1', {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector('[data-sensor], #sec-button, .dd-done, h1, h2', { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1200))
  const dialog = await page.$('[role=dialog]')
  if (dialog) {
    await page.keyboard.press('Escape')
    await new Promise((r) => setTimeout(r, 400))
  }
  // scroll a bit into content so demos visible
  await page.evaluate(() => {
    const root = document.querySelector('[data-scroll-root]') || document.querySelector('main')
    if (root) root.scrollTop = 0
  })
  const themeAttr = await page.evaluate(() => ({
    dataTheme: document.documentElement.getAttribute('data-theme'),
    title: document.title,
    readyBadges: document.querySelectorAll('.dd-done').length,
    plannedBadges: document.querySelectorAll('.dd-soon').length,
    text: (document.querySelector('h1,h2') || {}).textContent,
  }))
  console.log(name, themeAttr)
  if (mode === 'dark' && themeAttr.dataTheme === 'light') throw new Error('dark theme failed')
  if (mode === 'light' && themeAttr.dataTheme !== 'light') throw new Error('light theme failed')
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: false })
  console.log('wrote', file, fs.statSync(file).size)
  await page.close()
}

await shot('light', 'components-light.png')
await shot('dark', 'components-dark.png')
await browser.close()
server.close()
