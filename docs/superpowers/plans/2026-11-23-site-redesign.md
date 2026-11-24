# Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the three-page static site into the dark, warm "After dark" look with real food photography, an email-only hero sign-up, config-gated retention features (counter, skit strip, bottle photos), a share-after-sign-up prompt, a sticky mobile pre-order bar, and proper share and SEO meta. Every existing form keeps sending the same email it sends today.

**Architecture:** The site stays plain HTML, CSS and JS with no build step. A new shared stylesheet `eow.css` holds the theme tokens and component classes, and the pages move from inline styles to those classes. `eow.js` keeps its tiny `DCLogic` runtime and `eowSend`. It gains one `EOW_CONFIG` object, which tests can override, and a few helpers. Photos are processed once by a committed Python script into `img/` as WebP plus JPEG. Tests are a plain Node and Playwright script that serves the folder locally and mocks FormSubmit.

**Tech Stack:** HTML/CSS/vanilla JS, Google Fonts (Inter Tight), Python 3 + Pillow (image processing, dev only), Node 22 + preinstalled `playwright` (tests, dev only). Netlify deploys `main` with `publish = "."`.

**Spec:** `docs/superpowers/specs/2026-11-23-site-redesign-design.md`

## Global Constraints

- Colors: bg `#0F0D0C`, surface `#1A1614`, text `#F4EDE2`, muted `#BFB4A6`, ember `#E2582B` (buttons), highlight `#F08A4B`. Flavor accents: Original `#E4DCC4`, Grill Master `#A9461C`, Smoke Alarm `#D13A22`.
- Type: Inter Tight only. Headings 800–900 weight, uppercase, tight. Body 400–500. Remove Bowlby One and DM Sans.
- Every text/background pair is at least 4.5:1 contrast.
- Forms unchanged: endpoint `https://formsubmit.co/ajax/everyotherweekendsauce@gmail.com`, subjects `Pre-sale list: <email>`, `Pre-order EOW-####: <name>`, `Store request: <store> (<city>)`, and the same thank-you and mailto fallback behavior.
- Keep the existing copy and headline "Good on everything. Even his cooking." Facts come only from the site: $7.99 per 12 fl oz, $0 due today, three flavors. US spelling.
- Never show: code-drawn bottles, placeholder boxes, recipe or ingredient amounts, father-son company framing, ship-date countdowns, discounts, or perks not already on the site.
- Config-gated sections are `hidden` in the markup and shown only by JS when real content exists, so they stay hidden if JS fails.
- Photos: free-license stock (Unsplash or Pexels), stored in `img/`, no hotlinks. About 250 KB or less each. Hero about 1800px wide, cards about 900px. `<picture>` WebP with JPEG fallback, `width`/`height`, real alt text, `loading="lazy"` below the hero.
- Home page first-load weight is under about 2 MB.
- Site URL `https://everyotherweekendco.netlify.app` lives in `EOW_CONFIG.siteUrl` and, because static meta can't read JS, in each page's `og:url`/`og:image`. A test keeps them equal.

## Review Focus

1. **Phone width (390px):** no horizontal scroll on any page, nav wraps, cards stack. Owned by Task 2 (`noHorizontalScroll`).
2. **Photos fail or load slowly:** hero text stays readable on the fallback background color. Owned by Task 4 (`heroReadableWithoutImages`).
3. **Double-tap on a submit button:** exactly one POST. Owned by Task 4 (`heroDoubleClickSendsOnce`).
4. **FormSubmit down:** the hero form shows its own error and a mailto fallback with the hero details, and the bottom form's fallback stays hidden. Owned by Task 4 (`heroFailureShowsOwnFallback`).
5. **JavaScript blocked or broken:** no gated section (counter, skit strip, bottle photos, sticky bar) is visible. Owned by Task 5 (`gatedSectionsHiddenWithoutJs`).

---

### Task 1: Test harness, form-payload baseline, and config

Pins today's form behavior before any markup changes, and adds the config object that later tasks read.

**Files:**
- Create: `tests/run.mjs`, the test runner (static server, Playwright, form mock, a `test(name, fn)` registry, and a summary that exits non-zero on failure)
- Create: `tests/forms.test.mjs`
- Modify: `eow.js`, adding `EOW_CONFIG` above `eowSend`
- Modify: `netlify.toml`, so `tests/`, `tools/` and `docs/` aren't published (add `[[redirects]]` from `/tests/*`, `/tools/*` and `/docs/*` to `/404` with status 404)

**Interfaces:**
- Produces, in `tests/run.mjs`:
  - `test(name, async ({ page, posts, site }) => {})`
  - `openPage(path, { viewport?, config?, failForms?, javaScriptEnabled?, blockImages? })` returns `{ page, posts }`
  - `posts` is an array of the parsed JSON bodies POSTed to formsubmit.co, which is mocked with `{success:"true"}`, or a 500 response when `failForms`
  - `config` is injected via `addInitScript` as `window.EOW_CONFIG_OVERRIDE`
  - Run all tests with `node tests/run.mjs`, or one file or test with `node tests/run.mjs forms heroDoubleClick`
- Produces, in `eow.js`:
  ```js
  var EOW_CONFIG = Object.assign({
    siteUrl: 'https://everyotherweekendco.netlify.app',
    reserved: 0,          // bottles reserved; counter hidden while 0
    batchTotal: null,     // set to a number to show a progress bar
    videos: [],           // [{ url, poster, title }] newest first; strip hidden while empty
    bottles: { original: false, grill: false, smoke: false } // true once img/bottle-<key>.webp exists
  }, window.EOW_CONFIG_OVERRIDE || {});
  ```

- [ ] **Step 1: Write the baseline tests** in `tests/forms.test.mjs`. They must pass on the current site.
  - `presaleFormSendsSameEmail`: on `/`, fill the bottom form's name "Sam", email "sam@example.com", ZIP "90210" and flavor "Grill Master", then submit. Expect one post with `_subject === 'Pre-sale list: sam@example.com'`, `message` containing `Name: Sam`, `ZIP: 90210` and `Most excited for: Grill Master`, and `_replyto === 'sam@example.com'`. The "You're on the list" text is visible.
  - `presaleRejectsBadEmail`: email "nope", submit. Zero posts, and "Add your email so we can reach you." is visible.
  - `preorderSendsSameEmail`: on `/preorder.html`, fill the required fields and submit. `_subject` matches `/^Pre-order EOW-\d{4}: /` and `message` contains `$0 today`.
  - `storeRequestSendsSameEmail`: on `/stores.html`, store "Bristol Farms", city "Pasadena" and email, then submit. `_subject === 'Store request: Bristol Farms (Pasadena)'`.
  - `failureShowsMailtoFallback`: with `failForms`, submit the pre-sale form. A visible `a[href^="mailto:everyotherweekendsauce@gmail.com"]` appears with the error text.
- [ ] **Step 2: Run** `node tests/run.mjs forms`. Expected: 5 passed. If one fails, fix the harness, not the site.
- [ ] **Step 3: Add `EOW_CONFIG`** to `eow.js` exactly as above, and the `netlify.toml` redirects.
- [ ] **Step 4: Add `configOverrideApplies`**: `openPage('/', { config: { reserved: 12 } })`, then `page.evaluate(() => EOW_CONFIG.reserved) === 12` and `EOW_CONFIG.siteUrl` is still the default.
- [ ] **Step 5: Run** `node tests/run.mjs`. Expected: 6 passed.
- [ ] **Step 6: Commit** with the message `test: add site test harness, pin form payloads, add EOW_CONFIG`.

### Task 2: Theme stylesheet and shared chrome (nav, footer, fonts) on all three pages

**Files:**
- Create: `eow.css`
- Modify: the `<head>` (fonts, `theme-color` `#0F0D0C`, link `eow.css`), `<header>`/nav and `<footer>` of `index.html`, `preorder.html` and `stores.html`
- Create: `tests/theme.test.mjs`

**Interfaces:**
- Produces, as CSS custom properties on `:root`: `--bg --surface --text --muted --ember --hi --original --grill --smoke`, plus `--font: 'Inter Tight', system-ui, sans-serif`.
- Produces these classes, which later tasks use (spacing and details are the builder's):
  - layout: `.wrap` (max-width 1200px, 24px gutter)
  - type: `.eyebrow`, `.h-display`, `.h-section`, `.muted`
  - buttons: `.btn`, `.btn-primary` (ember bg, dark text), `.btn-ghost`
  - forms: `.field`/`.field span`/`.field input`, restyled for dark
  - surfaces: `.card`, `.photo` (rounded frame with a bottom dark gradient for overlaid text), `.glow` (warm radial spotlight)
  - chips: `.chip` and `.chip[aria-pressed="true"]`
- Nav, the same on all pages: wordmark (Inter Tight 900, uppercase, letter-spaced) linking to `index.html#top`, then Flavors, Story, Request a store, and a `.btn-primary` "Pre-order" linking to `preorder.html`.

- [ ] **Step 1: Write the failing tests** in `tests/theme.test.mjs`, looping over `/`, `/preorder.html` and `/stores.html`:
  - `darkBackground`: `getComputedStyle(document.body).backgroundColor === 'rgb(15, 13, 12)'`.
  - `interTightOnly`: computed `font-family` of `body`, `h1` and `nav a` starts with `"Inter Tight"`, and no stylesheet link contains `Bowlby` or `DM+Sans`.
  - `navConsistent`: nav link texts equal `['Flavors','Story','Request a store','Pre-order']` after the wordmark.
  - `contrastPasses`: for `body`, `.muted`, `.btn-primary`, `.field input` and `nav a`, the contrast ratio of computed color against the nearest opaque background is at least 4.5. Put the `contrast(fg, bg)` WCAG helper in `run.mjs`.
  - `noHorizontalScroll` (Review Focus 1): at viewport 390×844, `document.documentElement.scrollWidth <= 390`.
- [ ] **Step 2: Run** `node tests/run.mjs theme`. Expected: FAIL on darkBackground and interTightOnly.
- [ ] **Step 3: Implement `eow.css`, and switch the heads, nav and footer** on all three pages. Update the chip `data-base` and `on`/`off` style strings in each page's `renderVals()` to the dark palette. The runtime writes those inline, so the CSS alone won't win.
- [ ] **Step 4: Run** `node tests/run.mjs`. Expected: all pass, including Task 1's form tests.
- [ ] **Step 5: Commit** with the message `feat: dark After-dark theme, shared nav and footer`.

### Task 3: Photo pipeline and photo assets

Needs network access to Unsplash or Pexels (`images.unsplash.com`, `unsplash.com` or `images.pexels.com`), approved by Jack. If access is refused, stop and ask him for his own photos, which go through the same script.

**Files:**
- Create: `tools/make-images.py`, run as `python3 tools/make-images.py <src> <name> <width>`. It writes `img/<name>.webp` (quality about 78) and `img/<name>.jpg` (quality about 80, progressive), resized to `<width>`, EXIF stripped, and lowers quality until each file is ≤250 KB.
- Create: `img/hero.{webp,jpg}` (grill or wings, 1800w), `img/flavor-original.*` (tenders or fries, 900w), `img/flavor-grill.*` (burgers or ribs, 900w), `img/flavor-smoke.*` (wings or pizza, 900w), `img/band-preorder.*` and `img/band-stores.*` (1800w, short crop), `img/og-share.jpg` (exactly 1200×630), and `img/favicon.png` (180×180, the wordmark initials "EOW" on `--bg`, made in Pillow, no photo)
- Create: `img/CREDITS.md`, listing each file with its source URL, photographer and license
- Create: `tests/images.test.mjs`

- [ ] **Step 1: Write the failing tests**:
  - `imagesExistAndSmall`: every name above exists in both formats where listed, and each file is ≤ 256,000 bytes.
  - `ogImageSize`: read the dimensions of `img/og-share.jpg` (PNG/JPEG header parse in Node, or `python3 -c` via `child_process`). They must be 1200×630.
  - `creditsCoverEveryPhoto`: every `img/*.jpg` except `og-share.jpg` appears in `CREDITS.md` with a license line.
- [ ] **Step 2: Run** `node tests/run.mjs images`. Expected: FAIL (no files).
- [ ] **Step 3: Choose and download photos.** Pick warm, real, close-up food or grill shots with no visible brand labels and no people's faces. Avoid anything that looks AI-generated. Process them with the script and write `CREDITS.md`.
- [ ] **Step 4: Run** `node tests/run.mjs images`. Expected: 3 passed.
- [ ] **Step 5: Commit** with the message `feat: add licensed food photography and image pipeline`.

### Task 4: Home page restyle, hero photo and email-only hero sign-up

**Files:**
- Modify: `index.html` (markup and the inline `Component`)
- Modify: `eow.js` (`eowMount` fallback and busy handling, below)
- Create: `tests/home.test.mjs`

**Interfaces:**
- Consumes: Task 2 classes and Task 3 images.
- Produces, in `index.html`'s `Component`:
  - new state `hEmail`, plus `sendFailed` that holds the failing form's key (`'hero'` or `'notify'`) instead of `true`
  - `renderVals()` adds `hEmail`, `setHEmail`, `heroSubmit`, `heroHref`, `heroSent`, `heroNotSent`, `heroErr` and `heroHasErr`
  - the bottom form's error flags become `notifyErr`/`notifyHasErr`, so the two forms' errors never show together
- `submitter(check, after, hrefKey, formKey)`: reads the subject and body from `v[hrefKey]`, sets `sendFailed: formKey` on failure, and scrolls to the `[data-form]` that contains the clicked button, not the first one on the page.
- `eowMount` changes in `eow.js`:
  - `[data-fallback]` elements read their href from `v[el.getAttribute('data-fallback')]` and are shown only when `c.state.sendFailed === el.getAttribute('data-for')`
  - `[data-busy]` behavior is unchanged
- Hero email body (exact copy): `heroHref = mailHref('Pre-sale list: ' + email, ['Hi Every Other Weekend!', '', 'Please add me to the pre-sale list.', '', 'Email: ' + email, '', 'Signed up from: top of page', '(Sent from the Every Other Weekend website)'])`.

Page structure, top to bottom:
1. **Hero** (`#top`): `.glow` and full-bleed `<picture>` of `img/hero`, eager, with `fetchpriority="high"` and a dark gradient. `.eyebrow` "Batch 001 · Pre-sale open". `h1.h-display` "Good on everything. Even his cooking." One existing line of copy. `.btn-primary` "Reserve bottles · $0 today" linking to `preorder.html`. A `[data-form]` with a visually-labeled email input and a "Get first dibs" button (`data-click="heroSubmit"`, `data-busy`), followed by `[data-if="heroHasErr"]`, the fallback `a[data-fallback="heroHref"][data-for="hero"]`, and the thank-you `[data-if="heroSent"]`.
2. **Flavors** (`#flavors`): three `.card`s, each with a lazy `<picture>` of its `img/flavor-*`, the existing name, quote, description, "good on" tags, $7.99, and a pre-order link to `preorder.html#original|grill|smoke`. Each card also has a hidden `img.bottle[data-bottle="original|grill|smoke"]`, which Task 5 wires up.
3. **Existing sections, same copy, new styling:** the marquee strip, the "48 hours" line, the "Still learning? / Already a great cook?" pair, Dad's Rules (`#rules`), Story (`#story`) and FAQ (`#faq`).
4. **Bottom pre-sale form and footer:** the existing pre-sale list form (`#find`) and footer.

Remove all inline SVG bottles, `.pour` SVGs, the gingham background and its scroll code, and any `[data-px]` that only moved bottles. Keep the reveal and marquee behavior, with the word-highlight colors switched to `--muted` → `--text`.

- [ ] **Step 1: Write the failing tests** in `tests/home.test.mjs`:
  - `heroSignupSendsEmailOnly`: fill the hero email "ana@example.com" and click "Get first dibs". One post with `_subject === 'Pre-sale list: ana@example.com'`, and `message` contains `Signed up from: top of page` and does not contain `ZIP:`. The hero thank-you is visible, and the bottom form is still unsent.
  - `heroRejectsBadEmail`: "x@" gives zero posts and the hero error is visible. The bottom form's error is not visible.
  - `heroDoubleClickSendsOnce` (Review Focus 3): fill a valid email, then `dblclick` the button. `posts.length === 1`.
  - `heroFailureShowsOwnFallback` (Review Focus 4): with `failForms`, submit the hero form. The visible fallback link's href contains `Signed%20up%20from%3A%20top%20of%20page`, and the bottom form's fallback is hidden.
  - `heroReadableWithoutImages` (Review Focus 2): with `blockImages`, the `h1` is visible, and the contrast of its color against the hero's computed `background-color` is at least 4.5.
  - `noDrawnBottles`: `document.querySelectorAll('svg[aria-label*="bottle" i], svg.pour').length === 0`.
  - `photosHaveAltAndSize`: every `img` that isn't `.bottle` has non-empty `alt`, `width` and `height`. All except the hero have `loading="lazy"`.
  - `noRecipeContent`: the visible text of all three pages matches neither `/\brecipe\b/i` nor `/\b\d+\s?(g|grams|tbsp|tsp|cups?)\b/i`.
- [ ] **Step 2: Run** `node tests/run.mjs home`. Expected: FAIL (no hero form, SVG bottles present).
- [ ] **Step 3: Implement** the markup, the `Component` changes and the `eowMount` changes above.
- [ ] **Step 4: Run** `node tests/run.mjs`. Expected: all pass, including `presaleFormSendsSameEmail` and `failureShowsMailtoFallback` from Task 1.
- [ ] **Step 5: Commit** with the message `feat: home page restyle with real photos and email-only hero sign-up`.

### Task 5: Retention features (counter, skit strip, bottle slots, share prompt, sticky bar, target line)

**Files:**
- Modify: `eow.js`, adding `eowApplyConfig(root)` and `eowShare(btn)` and calling `eowApplyConfig` at the end of `eowMount`
- Modify: `index.html` (markup) and `eow.css`
- Create: `tests/retention.test.mjs`

**Interfaces:**
- Consumes: `EOW_CONFIG` (Task 1) and the `.bottle[data-bottle]` slots (Task 4).
- Produces, from `eowApplyConfig(root)`. Each element starts `hidden` in the markup:
  - **Counter** `[data-counter]`: shown when `EOW_CONFIG.reserved > 0`. Its `[data-counter-text]` reads `` `${reserved.toLocaleString('en-US')} bottles reserved from Batch 001` ``. When `batchTotal` is a positive number, `[data-counter-bar]` is shown with width `min(100, reserved/batchTotal*100)%` and `role="progressbar"`, `aria-valuenow` and `aria-valuemax`. Put the counter under the hero CTA.
  - **Skit strip** `#watch[data-videos]`: shown when `videos.length > 0`. It renders one `a.video-card` per item, with `href=url`, `target="_blank"`, `rel="noopener"`, and an `img` of `poster` (alt = title, lazy) plus the title. Build them with DOM methods, never `innerHTML`, because config values are data. It's followed by an always-present "Follow @everyotherweekend" link inside the strip. Put it between Flavors and the existing sections.
  - **Bottle slots:** for each key where `bottles[key]` is true, set `img.bottle[data-bottle=key]` `src` to `img/bottle-<key>.webp`, `alt` to `"<Flavor name> bottle"`, and unhide it.
  - **Sticky bar** `[data-sticky]`: an `a.btn-primary` "Pre-order · $0 today" linking to `preorder.html`. Shown only when `matchMedia('(max-width: 720px)')` matches and the hero's bottom is above the viewport top (IntersectionObserver on `#top`). Hide it again when scrolling back up or when `#find` is in view.
- `eowShare(btn)`: uses `navigator.share({ title: 'Every Other Weekend', text: 'Know someone who grills? Send them this.', url: EOW_CONFIG.siteUrl })` when available. Otherwise it writes to `navigator.clipboard.writeText(EOW_CONFIG.siteUrl)` and sets the button text to "Link copied". It's wired to `[data-share]` buttons that appear inside both thank-you messages (hero and bottom), with the visible copy "Know someone who grills? Send them this".
- **Target line** (static, no countdown): `.eyebrow` "Target: spring 2027" near the counter.

- [ ] **Step 1: Write the failing tests** in `tests/retention.test.mjs`:
  - `counterHiddenAtZero`: with the default config, `[data-counter]` is hidden.
  - `counterShowsCount`: with `{ reserved: 1234 }`, the text is "1,234 bottles reserved from Batch 001" and `[data-counter-bar]` is hidden.
  - `counterBarWithTotal`: with `{ reserved: 250, batchTotal: 1000 }`, the bar is visible with `aria-valuenow="250"` and a computed width of about 25%.
  - `videoStripHiddenWhenEmpty`: `#watch` is hidden.
  - `videoStripRendersItems`: with `{ videos: [{url:'https://www.tiktok.com/@everyotherweekend/video/1', poster:'img/flavor-grill.jpg', title:'Smoke alarm'}] }`, there's 1 `a.video-card` with that href, `rel` contains `noopener`, and the img alt is "Smoke alarm".
  - `videoTitleIsText`: with `title: '<img src=x onerror=alert(1)>'`, the card contains no injected `img[src="x"]` and its text equals the raw string.
  - `bottlesHiddenByDefault` and `bottleShownWhenFlagged` (`{ bottles: { original: true } }`): only the Original slot is visible, with src ending `img/bottle-original.webp`. Test with `page.route` serving any png for that path.
  - `shareAfterSignup`: stub `navigator.share` via `addInitScript` to record calls, sign up via the hero, and click the share button. It's called once with `url === 'https://everyotherweekendco.netlify.app'`.
  - `shareFallbackCopies`: delete `navigator.share` and grant clipboard permissions. After clicking, the button reads "Link copied".
  - `stickyBarMobileOnly`: at 390×844, hidden at the top, visible after `window.scrollTo(0, 1200)`. At 1280×800 after the same scroll, hidden.
  - `targetLineNoCountdown`: the text "Target: spring 2027" is present, and no text matches `/\b\d+\s*(days?|hrs?|hours|weeks?)\b/i`.
  - `gatedSectionsHiddenWithoutJs` (Review Focus 5): with `javaScriptEnabled: false` and config ignored, `[data-counter]`, `#watch`, `img.bottle` and `[data-sticky]` are all not visible.
- [ ] **Step 2: Run** `node tests/run.mjs retention`. Expected: FAIL.
- [ ] **Step 3: Implement** `eowApplyConfig`, `eowShare`, the markup and the styles.
- [ ] **Step 4: Run** `node tests/run.mjs`. Expected: all pass.
- [ ] **Step 5: Commit** with the message `feat: config-gated counter, skit strip, bottle slots, share prompt, sticky mobile bar`.

### Task 6: Pre-order and Request a store restyle

**Files:**
- Modify: `preorder.html` and `stores.html` (body markup, and the inline style strings in each `renderVals()`)
- Create: `tests/subpages.test.mjs`

Each page gets a top photo band (`img/band-preorder` and `img/band-stores`, eager, `.photo` with the page's existing `h1` overlaid) and then its existing content in `.card`/`.field`/`.chip` styles. Form fields, validation, messages, the `#original|grill|smoke` hash preselect and the order-number logic don't change. The quantity steppers and summary use `--surface` cards. The thank-you messages include the `[data-share]` button from Task 5. Load `eowApplyConfig` via `eowMount`, which the pages already call.

- [ ] **Step 1: Write the failing tests**:
  - `bandPhotoPresent`: on both pages, the first `picture img` src contains `band-`, it has alt text, and the `h1` text is unchanged ("Stock the fridge." and "Not on shelves. Yet.").
  - `hashPreselectStillWorks`: on `/preorder.html#smoke`, the Smoke Alarm qty is 1 and the others are 0.
  - `shareOnPreorderThanks`: after a successful pre-order, a `[data-share]` button is visible.
  - `noDrawnBottlesSubpages`: the same assertion as `noDrawnBottles`, on both pages.
- [ ] **Step 2: Run** `node tests/run.mjs subpages`. Expected: FAIL.
- [ ] **Step 3: Implement** the restyle on both pages.
- [ ] **Step 4: Run** `node tests/run.mjs`. Expected: all pass, including `preorderSendsSameEmail` and `storeRequestSendsSameEmail`.
- [ ] **Step 5: Commit** with the message `feat: restyle pre-order and request-a-store pages`.

### Task 7: Share meta, SEO basics, page weight, and preview handoff

**Files:**
- Modify: the `<head>` of all three pages
- Create: `tests/meta.test.mjs`

Each page gets its own `<title>` and `meta description`:
- Home: "Every Other Weekend — Good on everything. Even his cooking."
- Pre-order: "Pre-order — Every Other Weekend"
- Stores: "Request a store — Every Other Weekend"

Each page also gets `og:title`, `og:description`, `og:type`, `og:url` (the page's absolute URL), `og:image` (`https://everyotherweekendco.netlify.app/img/og-share.jpg`), `og:image:width` 1200, `og:image:height` 630, `twitter:card` `summary_large_image`, `link rel="icon"` and `apple-touch-icon` set to `img/favicon.png`, and `theme-color` `#0F0D0C`. Descriptions reuse existing site copy. Change "ranch-style sauce" to "small-batch sauces", because Grill Master and Smoke Alarm aren't ranch.

- [ ] **Step 1: Write the failing tests**:
  - `metaComplete`: on each page, every tag above exists with non-empty content, and titles are unique.
  - `siteUrlInOnePlace`: every `og:url` and `og:image` starts with `page.evaluate(() => EOW_CONFIG.siteUrl)`.
  - `homeUnder2MB`: load `/` at 1280×800 with the network cache disabled and no scrolling, sum `response.body().length` for all same-origin responses plus fonts, and expect less than 2,000,000.
- [ ] **Step 2: Run** `node tests/run.mjs meta`. Expected: FAIL.
- [ ] **Step 3: Implement** the head tags.
- [ ] **Step 4: Run** `node tests/run.mjs`. Expected: all pass. Paste the summary line into the PR body.
- [ ] **Step 5: Commit and push** with the message `feat: share previews, favicon, per-page titles`, then run `git push -u origin claude/project-thread-fgq6k3`. Netlify rebuilds `https://deploy-preview-1--everyotherweekendco.netlify.app`.
- [ ] **Step 6: Check the preview.** Take screenshots of the preview URL at 1280×800 and 390×844 for all three pages, with a Playwright script run from the scratchpad, not committed. Confirm it renders the same as local. Don't submit forms on the preview: it's an unactivated address, so a submission emails the brand Gmail an activation request and the visitor sees the fallback.
- [ ] **Step 7: Hand off to Jack.** Send the preview link and screenshots. Tell him that forms on the preview won't send until the change is merged, because the live address is already activated. Merging is his call.
