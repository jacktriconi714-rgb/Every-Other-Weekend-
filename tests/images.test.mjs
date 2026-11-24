import fs from 'node:fs';
import path from 'node:path';
import { test, assert, eq, ROOT } from './run.mjs';

const IMG = path.join(ROOT, 'img');
const PHOTOS = ['hero', 'flavor-original', 'flavor-grill', 'flavor-smoke', 'band-preorder', 'band-stores'];

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

test('imagesExistAndSmall', async () => {
  const files = PHOTOS.flatMap((n) => [n + '.webp', n + '.jpg']).concat(['og-share.jpg', 'favicon.png']);
  for (const f of files) {
    const p = path.join(IMG, f);
    assert(fs.existsSync(p), 'missing ' + f);
    const size = fs.statSync(p).size;
    assert(size <= 256000, f + ' is ' + size + ' bytes');
  }
});

test('ogImageSize', async () => {
  const d = jpegSize(fs.readFileSync(path.join(IMG, 'og-share.jpg')));
  eq(d && d.w, 1200, 'width'); eq(d && d.h, 630, 'height');
});

test('creditsCoverEveryPhoto', async () => {
  const credits = fs.readFileSync(path.join(IMG, 'CREDITS.md'), 'utf8');
  for (const f of fs.readdirSync(IMG).filter((f) => f.endsWith('.jpg') && f !== 'og-share.jpg')) {
    const line = credits.split('\n').find((l) => l.includes(f));
    assert(line, 'no credit for ' + f);
    assert(/license/i.test(line), 'no license on credit line for ' + f);
  }
});
