#!/usr/bin/env python3
"""Resize a source photo into img/<name>.webp and img/<name>.jpg, each <= 250 KB.

Usage: python3 tools/make-images.py <src> <name> <width> [aspect] [focus_y]
  aspect   optional crop ratio like 3:1 or 16:9 (center crop)
  focus_y  optional vertical focus 0..1 for the crop (default 0.5)
Dev-only tool; needs Pillow.
"""
import io
import os
import sys

from PIL import Image, ImageOps

LIMIT = 250_000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')


def crop(im, aspect, focus_y):
    a, b = (float(x) for x in aspect.split(':'))
    want = a / b
    w, h = im.size
    if w / h > want:  # too wide
        nw = int(h * want)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(w / want)
    y = int(max(0, min(h - nh, focus_y * h - nh / 2)))
    return im.crop((0, y, w, y + nh))


def save_under(im, path, fmt, q, **kw):
    while True:
        buf = io.BytesIO()
        im.save(buf, fmt, quality=q, **kw)
        if buf.tell() <= LIMIT or q <= 40:
            break
        q -= 5
    with open(path, 'wb') as f:
        f.write(buf.getvalue())
    return q, buf.tell()


def main():
    src, name, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
    aspect = sys.argv[4] if len(sys.argv) > 4 else None
    focus_y = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    if aspect:
        im = crop(im, aspect, focus_y)
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    qw, sw = save_under(im, os.path.join(OUT, name + '.webp'), 'WEBP', 78, method=6)
    qj, sj = save_under(im, os.path.join(OUT, name + '.jpg'), 'JPEG', 80, progressive=True, optimize=True)
    print(f'{name}: {im.width}x{im.height} webp q{qw} {sw}B, jpg q{qj} {sj}B')


if __name__ == '__main__':
    main()
