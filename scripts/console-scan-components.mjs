import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'node:http'
import puppeteer from 'puppeteer-core'

const root = path.resolve('dist')
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
    const index = path.join(root, 'index.html')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    fs.createReadStream(index).pipe(res)
    return
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4179, '127.0.0.1', r))
const chrome =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text())
})
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('theme-storage', JSON.stringify({ state: { mode: 'light' }, version: 0 }))
  localStorage.setItem(
    'help-storage',
    JSON.stringify({ state: { lastSeenHighlightsVersion: '0.1.0' }, version: 0 }),
  )
})
await page.goto('http://127.0.0.1:4179/#/components?seedDemo=1', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('h1, h2', { timeout: 30000 })
await new Promise((r) => setTimeout(r, 1000))
const dialog = await page.$('[role=dialog]')
if (dialog) {
  await page.keyboard.press('Escape')
  await new Promise((r) => setTimeout(r, 300))
}

await page.evaluate(async () => {
  const root = document.querySelector('main') || document.scrollingElement
  if (!root) return
  const max = Math.max(root.scrollHeight || 0, 8000)
  for (let y = 0; y < max; y += 500) {
    root.scrollTop = y
    await new Promise((r) => setTimeout(r, 30))
  }
})

for (const sel of [
  '[aria-label="评分"] button',
  '[aria-label="选择颜色"]',
  'button[aria-label="上一张"]',
  'button[aria-label="下一张"]',
]) {
  try {
    const el = await page.$(sel)
    if (el) {
      await el.click({ delay: 20 })
      await new Promise((r) => setTimeout(r, 150))
    }
  } catch (e) {
    errors.push('click fail ' + sel + ' ' + e.message)
  }
}

await new Promise((r) => setTimeout(r, 400))
const stats = await page.evaluate(() => ({
  ready: document.querySelectorAll('.dd-done').length,
  planned: document.querySelectorAll('.dd-soon').length,
  sections: [...document.querySelectorAll('[id^="sec-"]')].map((el) => el.id).length,
}))
console.log('stats', stats)
console.log('ERRORS', errors.length ? errors : 'none')
await browser.close()
server.close()
