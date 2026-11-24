import { test, openPage, assert, eq, contrast } from './run.mjs';

export const PAGES = ['/', '/preorder.html', '/stores.html'];

test('darkBackground', async () => {
  for (const p of PAGES) {
    const { page } = await openPage(p);
    eq(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(15, 13, 12)', p);
  }
});

test('interTightOnly', async () => {
  for (const p of PAGES) {
    const { page } = await openPage(p);
    const fams = await page.evaluate(() => ['body', 'h1', 'nav a'].map((s) => getComputedStyle(document.querySelector(s)).fontFamily));
    fams.forEach((f) => assert(f.startsWith('"Inter Tight"'), p + ' font ' + f));
    const links = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).join(' '));
    assert(!/Bowlby|DM\+Sans/.test(links), p + ' old fonts still linked');
  }
});

test('navConsistent', async () => {
  for (const p of PAGES) {
    const { page } = await openPage(p);
    const t = await page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Main"] a')].slice(1).map((a) => a.textContent.trim()));
    eq(JSON.stringify(t), JSON.stringify(['Flavors', 'Story', 'Request a store', 'Pre-order']), p);
  }
});

// nearest opaque background walking up the tree
async function pairs(page, sel) {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => el.offsetParent || el === document.body).map((el) => {
    const fg = getComputedStyle(el).color;
    let n = el, bg = 'rgb(15, 13, 12)';
    while (n && n.nodeType === 1) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c) && !/rgba\(.*,\s*0?\.\d+\)$/.test(c)) { bg = c; break; }
      n = n.parentElement;
    }
    return { fg, bg, sel };
  }), sel);
}

test('contrastPasses', async () => {
  for (const p of PAGES) {
    const { page } = await openPage(p);
    for (const sel of ['body', '.muted', '.btn-primary', '.field input', 'nav a']) {
      for (const { fg, bg } of await pairs(page, sel)) {
        const r = contrast(fg, bg);
        assert(r >= 4.5, `${p} ${sel} contrast ${r.toFixed(2)} (${fg} on ${bg})`);
      }
    }
  }
});

test('noHorizontalScroll', async () => {
  for (const p of PAGES) {
    const { page } = await openPage(p, { viewport: { width: 390, height: 844 } });
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    assert(w <= 390, p + ' scrollWidth ' + w);
  }
});
