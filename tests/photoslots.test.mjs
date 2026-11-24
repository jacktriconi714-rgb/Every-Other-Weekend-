import { test, openPage, assert, eq } from './run.mjs';

test('noOrangeGlow', async () => {
  for (const p of ['/', '/preorder.html', '/stores.html']) {
    const { page } = await openPage(p);
    const hits = await page.evaluate(() => [...document.querySelectorAll('*')].flatMap((el) => [null, '::before', '::after']
      .map((ps) => getComputedStyle(el, ps).backgroundImage).filter((b) => /radial-gradient/.test(b) && /226, 88, 43/.test(b))
      .map(() => el.className || el.tagName)));
    eq(hits.length, 0, p + ' glow on ' + hits.join(', '));
  }
});

test('photoSlotsShowOnPreview', async () => {
  const { page } = await openPage('/');
  const slots = page.locator('[data-photo-slot]:visible');
  eq(await slots.count(), 4, 'visible slots on preview/local');
  const labels = await slots.allTextContents();
  assert(labels.some((t) => /hero/i.test(t) && /all three bottles/i.test(t)), 'hero slot label: ' + labels[0]);
  for (const f of ['The Original', 'Grill Master', 'Smoke Alarm']) assert(labels.some((t) => t.includes(f)), 'no slot for ' + f);
});

test('photoSlotsHiddenOnLive', async () => {
  const { page } = await openPage('/');
  eq(await page.evaluate(() => eowShowPhotoSlots('everyotherweekendco.netlify.app')), false, 'live');
  eq(await page.evaluate(() => eowShowPhotoSlots('www.everyotherweekend.com')), false, 'custom domain');
  eq(await page.evaluate(() => eowShowPhotoSlots('deploy-preview-1--everyotherweekendco.netlify.app')), true, 'preview');
  const off = await openPage('/', { config: { showPhotoSlots: false } });
  eq(await off.page.locator('[data-photo-slot]:visible').count(), 0, 'forced off');
});

test('photoSlotsHiddenWithoutJs', async () => {
  const { page } = await openPage('/', { javaScriptEnabled: false });
  eq(await page.locator('[data-photo-slot]:visible').count(), 0);
});
