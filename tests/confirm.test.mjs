import { test, openPage, assert, eq } from './run.mjs';

async function signup(page) {
  await page.locator('#top input[type=email]').fill('ana@example.com');
  await page.locator('#top').getByRole('button', { name: 'Get first dibs' }).click();
  await page.waitForTimeout(300);
}

test('noConfirmationWhenOff', async () => {
  const { page, posts } = await openPage('/', { config: { confirmEmails: false } });
  await signup(page);
  eq(posts.length, 1);
  eq(posts[0]._autoresponse, undefined, 'autoresponse sent while off');
});

test('confirmationOnSignup', async () => {
  const { page, posts } = await openPage('/', { config: { confirmEmails: true } });
  await signup(page);
  assert(posts[0]._autoresponse && posts[0]._autoresponse.length > 40, 'no autoresponse');
  eq(posts[0].email, 'ana@example.com');
});

test('confirmationOnPreorderAndStore', async () => {
  let { page, posts } = await openPage('/preorder.html', { config: { confirmEmails: true } });
  await page.locator('[data-val="name"]').fill('Ana Ruiz');
  await page.locator('[data-val="email"]').fill('ana@example.com');
  await page.locator('[data-val="zip"]').fill('91001');
  await page.locator('[data-click="place"]').click();
  await page.waitForTimeout(300);
  assert(/pre-order/i.test(posts[0]._autoresponse || ''), 'preorder autoresponse');
  assert(/7 days/i.test(posts[0]._autoresponse), 'preorder autoresponse explains claim window');
  ({ page, posts } = await openPage('/stores.html', { config: { confirmEmails: true } }));
  await page.locator('[data-val="store"]').fill('Gelson’s');
  await page.locator('[data-val="where"]').fill('Pasadena');
  await page.locator('[data-val="email"]').fill('ana@example.com');
  await page.locator('[data-click="submit"]').click();
  await page.waitForTimeout(300);
  assert(/store/i.test(posts[0]._autoresponse || ''), 'store autoresponse');
});
