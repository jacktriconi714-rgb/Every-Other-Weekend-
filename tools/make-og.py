#!/usr/bin/env python3
"""Build img/og-share.jpg (1200x630 link preview) and img/favicon.png (180x180).

Usage: python3 tools/make-og.py <hero source photo> [font.otf]
Dev-only tool; needs Pillow. Default font: Inter Display Black if installed.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img')
BG = (15, 13, 12)
TEXT = (244, 237, 226)
EMBER = (226, 88, 43)
FONT = '/usr/share/fonts/opentype/inter/InterDisplay-Black.otf'


def font(size, path):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def og(src, fpath):
    im = ImageOps.fit(ImageOps.exif_transpose(Image.open(src)).convert('RGB'), (1200, 630), Image.LANCZOS)
    shade = Image.new('L', (1200, 630))
    d = ImageDraw.Draw(shade)
    for x in range(1200):  # dark on the left where the words sit
        d.line([(x, 0), (x, 630)], fill=int(250 * min(1.0, max(0.0, 1.35 - x / 820))))
    im = Image.composite(Image.new('RGB', im.size, BG), im, shade)
    d = ImageDraw.Draw(im)
    d.text((64, 70), 'BATCH 001 · PRE-SALE OPEN', font=font(26, fpath), fill=(240, 138, 75))
    big = font(92, fpath)
    for i, line in enumerate(['GOOD ON', 'EVERYTHING.']):
        d.text((60, 130 + i * 96), line, font=big, fill=TEXT)
    d.text((64, 350), 'Even his cooking.', font=font(40, fpath), fill=TEXT)
    d.rounded_rectangle((64, 470, 470, 540), radius=8, fill=EMBER)
    d.text((88, 486), 'PRE-ORDER · $0 TODAY', font=font(30, fpath), fill=(22, 12, 7))
    d.text((64, 572), 'EVERY OTHER WEEKEND', font=font(22, fpath), fill=(191, 180, 166))
    im.save(os.path.join(OUT, 'og-share.jpg'), 'JPEG', quality=82, progressive=True, optimize=True)


def favicon(fpath):
    im = Image.new('RGB', (180, 180), BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((10, 10, 170, 170), radius=28, outline=EMBER, width=6)
    f = font(56, fpath)
    w = d.textlength('EOW', font=f)
    d.text(((180 - w) / 2, 58), 'EOW', font=f, fill=TEXT)
    im.save(os.path.join(OUT, 'favicon.png'), 'PNG', optimize=True)


if __name__ == '__main__':
    fp = sys.argv[2] if len(sys.argv) > 2 else FONT
    og(sys.argv[1], fp)
    favicon(fp)
    print('wrote og-share.jpg and favicon.png')
