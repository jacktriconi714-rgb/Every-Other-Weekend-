import { test, openPage, assert, eq } from './run.mjs';

const PAGES = { '/': 'index.html', '/preorder.html': 'preorder.html', '/stores.html': 'stores.html' };
const SEL = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:type"]',
  'meta[property="og:url"]', 'meta[property="og:image"]', 'meta[property="og:image:width"]', 'meta[property="og:image:height"]',
  'meta[name="twitter:card"]', 'meta[name="theme-color"]'];

test('metaComplete', async () => {
  const titles = new Set();
  for (const p of Object.keys(PAGES)) {
    const { page } = await openPage(p);
    for (const s of SEL) {
      const c = await page.evaluate((s) => { const m = document.querySelector(s); return m && m.getAttribute('content'); }, s);
      assert(c && c.trim(), p + ' missing ' + s);
    }
    eq(await page.evaluate(() => document.querySelector('meta[property="og:image:width"]').content), '1200', p + ' og width');
    eq(await page.evaluate(() => document.querySelector('meta[property="og:image:height"]').content), '630', p + ' og height');
    eq(await page.evaluate(() => document.querySelector('meta[name="twitter:card"]').content), 'summary_large_image', p);
    eq(await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#0F0D0C', p);
    for (const rel of ['icon', 'apple-touch-icon']) {
      eq(await page.evaluate((r) => { const l = document.querySelector('link[rel="' + r + '"]'); return l && l.getAttribute('href'); }, rel), 'img/favicon.png', p + ' ' + rel);
    }
    titles.add(await page.title());
    assert(!/ranch-style/i.test(await page.evaluate(() => document.querySelector('meta[name="description"]').content)), p + ' description still says ranch-style');
  }
  eq(titles.size, 3, 'unique titles');
});

test('siteUrlInOnePlace', async () => {
  for (const [p, file] of Object.entries(PAGES)) {
    const { page } = await openPage(p);
    const [site, url, img] = await page.evaluate(() => [EOW_CONFIG.siteUrl,
      document.querySelector('meta[property="og:url"]').content, document.querySelector('meta[property="og:image"]').content]);
    assert(url.startsWith(site), p + ' og:url ' + url);
    eq(img, site + '/img/og-share.jpg', p + ' og:image');
    if (file !== 'index.html') assert(url.endsWith('/' + file), p + ' og:url should name the page');
  }
});

test('homeUnder2MB', async () => {
  let total = 0;
  const { page } = await openPage('/', { fonts: true, init: () => {} });
  // re-load with byte counting and cache off
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable'); await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  client.on('Network.loadingFinished', (e) => { total += e.encodedDataLength; });
  await page.reload({ waitUntil: 'networkidle' });
  assert(total > 0, 'nothing counted');
  assert(total < 2000000, 'home page weight ' + total + ' bytes');
});
