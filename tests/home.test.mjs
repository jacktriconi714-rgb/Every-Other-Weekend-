import { test, openPage, assert, eq, contrast } from './run.mjs';

const settle = (page) => page.waitForTimeout(300);
const hero = (page) => page.locator('#top [data-form]');

async function heroSignup(page, email) {
  await hero(page).locator('input[type=email]').fill(email);
  await hero(page).getByRole('button', { name: 'Get first dibs' }).click();
  await settle(page);
}

test('heroSignupSendsEmailOnly', async () => {
  const { page, posts } = await openPage('/');
  await heroSignup(page, 'ana@example.com');
  eq(posts.length, 1, 'posts');
  eq(posts[0]._subject, 'Pre-sale list: ana@example.com');
  eq(posts[0]._replyto, 'ana@example.com');
  assert(posts[0].message.includes('Signed up from: top of page'), 'no source line');
  assert(!posts[0].message.includes('ZIP:'), 'has ZIP line');
  assert(await page.locator('#top [data-if="heroSent"]').isVisible(), 'hero thank-you hidden');
  assert(await page.locator('#find [data-form]').isVisible(), 'bottom form should still be unsent');
});

test('heroRejectsBadEmail', async () => {
  const { page, posts } = await openPage('/');
  await heroSignup(page, 'x@');
  eq(posts.length, 0, 'posts');
  assert(await page.locator('#top [role=alert]').isVisible(), 'hero error hidden');
  eq(await page.locator('#find [role=alert]:visible').count(), 0, 'bottom error visible');
});

test('heroDoubleClickSendsOnce', async () => {
  const { page, posts } = await openPage('/');
  await hero(page).locator('input[type=email]').fill('dbl@example.com');
  await hero(page).getByRole('button', { name: 'Get first dibs' }).dblclick();
  await settle(page);
  eq(posts.length, 1, 'posts');
});

test('heroFailureShowsOwnFallback', async () => {
  const { page } = await openPage('/', { failForms: true });
  await heroSignup(page, 'ana@example.com');
  const href = await page.locator('#top a[data-fallback]').getAttribute('href');
  assert(await page.locator('#top a[data-fallback]').isVisible(), 'hero fallback hidden');
  assert(href.includes('Signed%20up%20from%3A%20top%20of%20page'), 'fallback href ' + href);
  eq(await page.locator('#find a[data-fallback]:visible').count(), 0, 'bottom fallback visible');
});

test('heroReadableWithoutImages', async () => {
  const { page } = await openPage('/', { blockImages: true });
  const h1 = page.locator('#top h1');
  assert(await h1.isVisible(), 'h1 hidden');
  const [fg, bg] = await page.evaluate(() => {
    const h = document.querySelector('#top h1');
    return [getComputedStyle(h).color, getComputedStyle(document.querySelector('#top')).backgroundColor];
  });
  const r = contrast(fg, bg);
  assert(r >= 4.5, 'contrast ' + r.toFixed(2) + ' ' + fg + ' on ' + bg);
});

test('noDrawnBottles', async () => {
  const { page } = await openPage('/');
  eq(await page.evaluate(() => document.querySelectorAll('svg[aria-label*="bottle" i], svg.pour').length), 0);
});

test('photosHaveAltAndSize', async () => {
  const { page } = await openPage('/');
  const bad = await page.evaluate(() => [...document.querySelectorAll('img:not(.bottle)')].filter((img) => {
    const isHero = !!img.closest('#top');
    return !img.getAttribute('alt') || !img.getAttribute('width') || !img.getAttribute('height') || (!isHero && img.getAttribute('loading') !== 'lazy');
  }).map((i) => i.outerHTML.slice(0, 80)));
  eq(bad.length, 0, bad.join(' | '));
  assert(await page.locator('#top picture img').count() === 1, 'no hero photo');
  eq(await page.locator('#flavors picture img').count(), 3, 'flavor photos');
});

// Sauce recipes are secret: no "our/the recipe", "recipe:", or ingredient amounts.
// ("No recipe, no skills" is customer copy about not needing one.)
test('noRecipeContent', async () => {
  for (const p of ['/', '/preorder.html', '/stores.html']) {
    const { page } = await openPage(p);
    const text = await page.evaluate(() => document.body.innerText);
    assert(!/\b(our|the|secret|family)\s+recipes?\b|\brecipes?\s*:/i.test(text), p + ' mentions a recipe');
    assert(!/\b\d+(\.\d+)?\s?(g|grams|tbsp|tsp|cups?|oz of)\b/i.test(text), p + ' has ingredient amounts');
  }
});
