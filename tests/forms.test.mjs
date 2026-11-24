import { test, openPage, assert, eq } from './run.mjs';

const settle = (page) => page.waitForTimeout(300);

export async function fillPresale(page, { name = 'Sam', email = 'sam@example.com', zip = '90210', fav = 'Grill Master' } = {}) {
  const form = page.locator('#find [data-form]');
  await form.locator('[data-val="nName"]').fill(name);
  await form.locator('[data-val="nEmail"]').fill(email);
  await form.locator('[data-val="nZip"]').fill(zip);
  if (fav) await form.locator('button.chip', { hasText: fav }).click();
  await form.locator('[data-click="notifySubmit"]').click();
  await settle(page);
}

test('presaleFormSendsSameEmail', async () => {
  const { page, posts } = await openPage('/');
  await fillPresale(page);
  eq(posts.length, 1, 'posts');
  eq(posts[0]._subject, 'Pre-sale list: sam@example.com');
  eq(posts[0]._replyto, 'sam@example.com');
  for (const s of ['Name: Sam', 'ZIP: 90210', 'Most excited for: Grill Master']) assert(posts[0].message.includes(s), 'message missing ' + s);
  assert(await page.locator('#find').getByText('You’re on the list').isVisible(), 'thank-you not visible');
});

test('presaleRejectsBadEmail', async () => {
  const { page, posts } = await openPage('/');
  await fillPresale(page, { email: 'nope', fav: null });
  eq(posts.length, 0, 'posts');
  assert(await page.locator('#find').getByText('Add your email so we can reach you.').isVisible(), 'error not visible');
});

test('preorderSendsSameEmail', async () => {
  const { page, posts } = await openPage('/preorder.html');
  await page.locator('[data-val="name"]').fill('Ana Ruiz');
  await page.locator('[data-val="email"]').fill('ana@example.com');
  await page.locator('[data-val="zip"]').fill('91001');
  await page.locator('[data-click="place"]').click();
  await settle(page);
  eq(posts.length, 1, 'posts');
  assert(/^Pre-order EOW-\d{4}: /.test(posts[0]._subject), 'subject ' + posts[0]._subject);
  assert(posts[0].message.includes('$0 today'), 'message missing $0 today');
});

test('storeRequestSendsSameEmail', async () => {
  const { page, posts } = await openPage('/stores.html');
  await page.locator('[data-val="store"]').fill('Bristol Farms');
  await page.locator('[data-val="where"]').fill('Pasadena');
  await page.locator('[data-val="email"]').fill('lee@example.com');
  await page.locator('[data-click="submit"]').click();
  await settle(page);
  eq(posts.length, 1, 'posts');
  eq(posts[0]._subject, 'Store request: Bristol Farms (Pasadena)');
});

test('failureShowsMailtoFallback', async () => {
  const { page } = await openPage('/', { failForms: true });
  await fillPresale(page);
  const link = page.locator('#find a[href^="mailto:everyotherweekendsauce@gmail.com"]:visible');
  assert(await link.count() >= 1, 'no visible fallback');
  assert(await page.locator('#find').getByText('didn’t go through').isVisible(), 'error text not visible');
});

test('configOverrideApplies', async () => {
  const { page } = await openPage('/', { config: { reserved: 12 } });
  eq(await page.evaluate(() => EOW_CONFIG.reserved), 12, 'reserved');
  eq(await page.evaluate(() => EOW_CONFIG.siteUrl), 'https://everyotherweekendco.netlify.app', 'siteUrl');
});
