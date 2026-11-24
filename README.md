# Every Other Weekend website

Static site for the Every Other Weekend sauce brand. No build step: Netlify publishes this folder as-is.

- `index.html`: home (flavors, story, FAQ, pre-sale list sign-up)
- `preorder.html`: pre-order (no payment taken)
- `stores.html`: request a store
- `eow.js`: small shared runtime; forms post to FormSubmit, which emails everyotherweekendsauce@gmail.com

If a send fails, the visitor is offered a prefilled email to the same inbox so no lead is lost.

Note: FormSubmit activation is tied to the site's web address. After renaming the Netlify site or connecting a custom domain, submit a form once and click the new "Activate Form" email in the brand inbox.

## Look and files

- `eow.css`: shared dark theme (colors, type, buttons, forms, nav, footer). `home.css` and `sub.css` hold page layouts.
- `img/`: photos as `.webp` + `.jpg` (credits in `img/CREDITS.md`). Make new ones with `python3 tools/make-images.py <photo> <name> <width> [aspect]`. `tools/make-og.py` rebuilds the link-preview image and tab icon.

## Turning things on (edit `EOW_CONFIG` at the top of `eow.js`)

Everything below stays hidden until real content exists, so the site never shows a placeholder.

- **Reservation counter:** set `reserved` to the number of bottles reserved. Set `batchTotal` once the first-batch size is known to show a progress bar.
- **Skit videos:** add `{ url, poster, title }` items to `videos`, newest first. `url` must be the https link to the TikTok or Instagram post, and `poster` is an image in `img/`.
- **Bottle photos:** save `img/bottle-original.webp`, `img/bottle-grill.webp` and `img/bottle-smoke.webp` (transparent background works best), then set that flavor to `true` in `bottles`.
- **Custom domain:** change `siteUrl`, plus the `og:url` and `og:image` lines at the top of each page.

## Tests

`node tests/run.mjs` serves the folder locally, mocks FormSubmit and checks the forms, theme, photos, gated sections and meta tags. It needs Node and Playwright, which are dev-only and never deployed.
