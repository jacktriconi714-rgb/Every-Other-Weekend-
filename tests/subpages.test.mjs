import { test, openPage, assert, eq } from './run.mjs';

test('bandPhotoPresent', async () => {
  for (const [p, h1] of [['/preorder.html', 'Stock the fridge.'], ['/stores.html', 'Not on shelves. Yet.']]) {
    const { page } = await openPage(p);
    const img = page.locator('picture img').first();
    assert((await img.getAttribute('src')).includes('band-'), p + ' band src');
    assert(await img.getAttribute('alt'), p + ' band alt');
    eq((await page.locator('h1').textContent()).trim(), h1, p);
  }
});

test('hashPreselectStillWorks', async () => {
  const { page } = await openPage('/preorder.html#smoke');
  await page.waitForTimeout(200);
  const q = await page.evaluate(() => ['q1', 'q2', 'q3'].map((k) => { const el = document.querySelector('[data-t="' + k + '"]'); return el && el.offsetParent ? el.textContent.trim() : '0'; }));
  eq(JSON.stringify(q), JSON.stringify(['0', '0', '1']));
});

test('shareOnPreorderThanks', async () => {
  const { page } = await openPage('/preorder.html');
  await page.locator('[data-val="name"]').fill('Ana Ruiz');
  await page.locator('[data-val="email"]').fill('ana@example.com');
  await page.locator('[data-val="zip"]').fill('91001');
  await page.locator('[data-click="place"]').click();
  await page.waitForTimeout(300);
  assert(await page.locator('[data-share]:visible').count() >= 1, 'no share button');
});

test('noDrawnBottlesSubpages', async () => {
  for (const p of ['/preorder.html', '/stores.html']) {
    const { page } = await openPage(p);
    eq(await page.evaluate(() => document.querySelectorAll('svg[aria-label*="bottle" i], svg.pour, [data-if^="has"] svg').length), 0, p);
  }
});
