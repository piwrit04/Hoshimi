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
    res.writeHead(404)
    res.end('missing')
    return
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4177, '127.0.0.1', r))
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
  // Must run before any page script so bootstrap + zustand see the mode.
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
  await page.goto('http://127.0.0.1:4177/#/dashboard?seedDemo=1', {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector('.l2g-workbench__card', { timeout: 25000 })
  const themeAttr = await page.evaluate(() => ({
    dataTheme: document.documentElement.getAttribute('data-theme'),
    colorScheme: document.documentElement.style.colorScheme,
    mode: JSON.parse(localStorage.getItem('theme-storage') || '{}')?.state?.mode,
    hasDarkClass: document.documentElement.classList.contains('dark'),
  }))
  console.log(name, 'theme', themeAttr)
  if (mode === 'dark' && themeAttr.dataTheme === 'light') {
    throw new Error('dark theme failed to apply')
  }
  if (mode === 'light' && themeAttr.dataTheme !== 'light') {
    throw new Error('light theme failed to apply')
  }
  await new Promise((r) => setTimeout(r, 900))
  const dialog = await page.$('[role=dialog]')
  if (dialog) {
    await page.keyboard.press('Escape')
    await new Promise((r) => setTimeout(r, 400))
  }
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: false })
  console.log('wrote', file, fs.statSync(file).size)
  await page.close()
}

await shot('light', 'workbench-light.png')
await shot('dark', 'workbench-dark.png')
await browser.close()
server.close()
