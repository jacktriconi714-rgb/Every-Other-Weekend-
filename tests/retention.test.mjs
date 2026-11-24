import { test, openPage, assert, eq } from './run.mjs';

const vis = (page, sel) => page.locator(sel).first().isVisible();
const settle = (page) => page.waitForTimeout(300);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

test('counterHiddenAtZero', async () => {
  const { page } = await openPage('/');
  assert(!(await vis(page, '[data-counter]')), 'counter visible');
});

test('counterShowsCount', async () => {
  const { page } = await openPage('/', { config: { reserved: 1234 } });
  assert(await vis(page, '[data-counter]'), 'counter hidden');
  eq((await page.locator('[data-counter-text]').textContent()).trim(), '1,234 bottles reserved from Batch 001');
  assert(!(await vis(page, '[data-counter-bar]')), 'bar visible without total');
});

test('counterBarWithTotal', async () => {
  const { page } = await openPage('/', { config: { reserved: 250, batchTotal: 1000 } });
  const bar = page.locator('[data-counter-bar]');
  assert(await bar.isVisible(), 'bar hidden');
  eq(await bar.getAttribute('aria-valuenow'), '250');
  const pct = await page.evaluate(() => { const f = document.querySelector('[data-counter-fill]'); return f.getBoundingClientRect().width / f.parentElement.getBoundingClientRect().width; });
  assert(Math.abs(pct - 0.25) < 0.02, 'fill ' + pct);
});

test('videoStripHiddenWhenEmpty', async () => {
  const { page } = await openPage('/');
  assert(!(await vis(page, '#watch')), 'strip visible');
});

test('videoStripRendersItems', async () => {
  const { page } = await openPage('/', { config: { videos: [{ url: 'https://www.tiktok.com/@everyotherweekend/video/1', poster: 'img/flavor-grill.jpg', title: 'Smoke alarm' }] } });
  assert(await vis(page, '#watch'), 'strip hidden');
  const cards = page.locator('#watch a.video-card');
  eq(await cards.count(), 1, 'cards');
  eq(await cards.first().getAttribute('href'), 'https://www.tiktok.com/@everyotherweekend/video/1');
  assert((await cards.first().getAttribute('rel')).includes('noopener'), 'rel');
  eq(await cards.first().locator('img').getAttribute('alt'), 'Smoke alarm');
});

test('videoTitleIsText', async () => {
  const evil = '<img src=x onerror=alert(1)>';
  const { page } = await openPage('/', { config: { videos: [{ url: 'https://www.tiktok.com/@everyotherweekend/video/2', poster: 'img/flavor-grill.jpg', title: evil }] } });
  eq(await page.locator('#watch img[src="x"]').count(), 0, 'injected img');
  eq((await page.locator('#watch a.video-card .video-title').textContent()).trim(), evil);
});

test('bottlesHiddenByDefault', async () => {
  const { page } = await openPage('/');
  eq(await page.locator('img.bottle:visible').count(), 0);
});

test('bottleShownWhenFlagged', async () => {
  const { page } = await openPage('/', { config: { bottles: { original: true } },
    routes: [[/bottle-original\.webp$/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG })]] });
  const shown = page.locator('img.bottle:visible');
  eq(await shown.count(), 1, 'visible bottles');
  assert((await shown.getAttribute('src')).endsWith('img/bottle-original.webp'), 'src');
  eq(await shown.getAttribute('data-bottle'), 'original');
  eq(await shown.getAttribute('alt'), 'The Original bottle');
});

async function heroSignup(page) {
  await page.locator('#top input[type=email]').fill('ana@example.com');
  await page.locator('#top').getByRole('button', { name: 'Get first dibs' }).click();
  await settle(page);
}

test('shareAfterSignup', async () => {
  const { page } = await openPage('/', { init: () => { window.__shares = []; navigator.share = (d) => { window.__shares.push(d); return Promise.resolve(); }; } });
  await heroSignup(page);
  await page.locator('#top [data-share]').click();
  const shares = await page.evaluate(() => window.__shares);
  eq(shares.length, 1, 'share calls');
  eq(shares[0].url, 'https://everyotherweekendco.netlify.app');
});

test('shareFallbackCopies', async () => {
  const { page } = await openPage('/', { permissions: ['clipboard-read', 'clipboard-write'], init: () => { try { delete Navigator.prototype.share; } catch (e) {} navigator.share = undefined; } });
  await heroSignup(page);
  await page.locator('#top [data-share]').click();
  await settle(page);
  eq((await page.locator('#top [data-share]').textContent()).trim(), 'Link copied');
});

test('stickyBarMobileOnly', async () => {
  let { page } = await openPage('/', { viewport: { width: 390, height: 844 } });
  assert(!(await vis(page, '[data-sticky]')), 'visible at top');
  await page.evaluate(() => window.scrollTo(0, 1200)); await settle(page);
  assert(await vis(page, '[data-sticky]'), 'hidden after scroll on phone');
  ({ page } = await openPage('/', { viewport: { width: 1280, height: 800 } }));
  await page.evaluate(() => window.scrollTo(0, 1200)); await settle(page);
  assert(!(await vis(page, '[data-sticky]')), 'visible on desktop');
});

test('targetLineNoCountdown', async () => {
  const { page } = await openPage('/');
  const text = await page.evaluate(() => document.body.innerText);
  assert(/Target: spring 2027/i.test(text), 'no target line');
  assert(!/\b\d+\s*(days?|hrs?|hours|weeks?)\b/i.test(text.replace(/48 hours/i, '')), 'countdown-like text');
});

test('gatedSectionsHiddenWithoutJs', async () => {
  const { page } = await openPage('/', { javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await page.evaluate(() => 0).catch(() => {});
  for (const sel of ['[data-counter]', '#watch', 'img.bottle', '[data-sticky]']) {
    eq(await page.locator(sel + ':visible').count(), 0, sel + ' visible without JS');
  }
});

test('stickyBarHiddenOverFooter', async () => {
  const { page } = await openPage('/', { viewport: { width: 390, height: 844 } });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(400);
  assert(!(await page.locator('[data-sticky]').isVisible()), 'sticky bar covers the footer');
});

test('noFakeThanksWithoutJs', async () => {
  for (const p of ['/', '/preorder.html', '/stores.html']) {
    const { page } = await openPage(p, { javaScriptEnabled: false });
    eq(await page.locator('[role=status]:visible').count(), 0, p + ' shows a thank-you without JS');
  }
});
