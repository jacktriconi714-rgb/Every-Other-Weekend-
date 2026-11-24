import { test, openPage, assert, eq } from './run.mjs';

test('brandNameLeadsHero', async () => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const { page } = await openPage('/', { viewport: vp });
    eq((await page.locator('#top h1').textContent()).trim().toLowerCase(), 'every other weekend', 'h1');
    const [h1, tag] = await page.evaluate(() => [document.querySelector('#top h1'), document.querySelector('#top .hero-tagline')]
      .map((el) => parseFloat(getComputedStyle(el).fontSize)));
    assert(h1 > tag * 1.6, vp.width + ': brand ' + h1 + 'px vs tagline ' + tag + 'px');
  }
});

test('taglineSaysTheir', async () => {
  for (const p of ['/', '/preorder.html', '/stores.html']) {
    const { page } = await openPage(p);
    const html = await page.content();
    assert(!/Even his cooking/i.test(html), p + ' still says his');
  }
  const { page } = await openPage('/');
  eq((await page.locator('#top .hero-tagline').textContent()).trim(), 'Good on everything. Even their cooking.');
});

test('confirmationsOnByDefault', async () => {
  const { page } = await openPage('/');
  eq(await page.evaluate(() => EOW_CONFIG.confirmEmails), true);
});
