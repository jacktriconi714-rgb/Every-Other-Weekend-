import { test, openPage, assert, eq } from './run.mjs';

const text = (page) => page.evaluate(() => document.body.innerText);

test('reservePriceOnHome', async () => {
  const { page } = await openPage('/');
  const t = await text(page);
  assert(t.includes('$5.99'), 'no $5.99 on home');
  assert(/7 days/i.test(await page.evaluate(() => document.body.textContent)), 'home FAQ does not explain the 7-day claim window');
  const desc = await page.evaluate(() => document.querySelector('meta[name="description"]').content);
  assert(desc.includes('$5.99'), 'meta description ' + desc);
});

test('preorderUsesReservePrice', async () => {
  const { page, posts } = await openPage('/preorder.html');
  // default cart is one of each flavor
  eq((await page.locator('[data-t="subtotal"]:visible').first().textContent()).trim(), '$17.97', 'subtotal');
  eq((await page.locator('[data-t="l1"]').textContent()).trim(), '$5.99', 'line total');
  const t = await text(page);
  assert(t.includes('$7.99'), 'regular price not shown for comparison');
  assert(/7 days/i.test(t), 'claim window not explained');
  await page.locator('[data-val="name"]').fill('Ana Ruiz');
  await page.locator('[data-val="email"]').fill('ana@example.com');
  await page.locator('[data-val="zip"]').fill('91001');
  await page.locator('[data-click="place"]').click();
  await page.waitForTimeout(300);
  assert(posts[0].message.includes('$17.97'), 'order email total');
});

test('photoSlotsOnByDefault', async () => {
  const { page } = await openPage('/');
  eq(await page.evaluate(() => EOW_CONFIG.showPhotoSlots), true);
});
