// Site test runner: serves the repo folder, drives Chromium with Playwright,
// mocks FormSubmit. Usage: node tests/run.mjs [fileFilter] [testFilter]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const tests = [];
export function test(name, fn) { tests.push({ name, fn, file: currentFile }); }
let currentFile = '';

// WCAG contrast of two "rgb(a)" strings
function lum(c) {
  const m = c.match(/[\d.]+/g).map(Number);
  const ch = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
export function eq(a, b, msg) { if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }

let server, base, browser;
async function start() {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch();
}

const open = [];
export async function openPage(p, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 800 },
    javaScriptEnabled: opts.javaScriptEnabled !== false, permissions: opts.permissions || [] });
  open.push(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(4000);
  const posts = [];
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  if (opts.config) await page.addInitScript((c) => { window.EOW_CONFIG_OVERRIDE = c; }, opts.config);
  if (opts.init) await page.addInitScript(opts.init);
  await page.route(/formsubmit\.co/, async (route) => {
    try { posts.push(JSON.parse(route.request().postData() || '{}')); } catch (e) { posts.push({}); }
    if (opts.failForms) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":"false","message":"down"}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true"}' });
  });
  // keep tests offline: Google Fonts allowed only when asked
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => opts.fonts ? route.continue() : route.abort());
  if (opts.blockImages) await page.route(/\.(webp|jpg|jpeg|png)(\?|$)/, (route) => route.abort());
  if (opts.routes) for (const [re, fn] of opts.routes) await page.route(re, fn);
  await page.goto(base + p, { waitUntil: 'load' });
  return { page, posts, base };
}

async function main() {
  const [fileFilter, testFilter] = process.argv.slice(2);
  const dir = path.join(ROOT, 'tests');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.mjs') && (!fileFilter || f.includes(fileFilter))).sort();
  for (const f of files) { currentFile = f; await import(pathToFileURL(path.join(dir, f)).href); }
  await start();
  let pass = 0, fail = 0;
  for (const t of tests) {
    if (testFilter && !t.name.includes(testFilter)) continue;
    try { await t.fn(); pass++; console.log('  ok   ' + t.file + ' › ' + t.name); }
    catch (e) { fail++; console.log('  FAIL ' + t.file + ' › ' + t.name + '\n       ' + String(e.message || e).split('\n')[0]); }
    while (open.length) await open.pop().close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
