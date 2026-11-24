# Every Other Weekend site redesign: design

Date: 2026-11-23 · Owner: Jack Triconi · Status: draft for approval

## Why

Jack thinks the live site (everyotherweekendco.netlify.app) looks "very 2D and fake." It doesn't feel like an established, experienced company. He wants a **polished, modern brand look** so a first-time visitor, usually arriving from TikTok or Instagram, trusts the brand enough to join the pre-sale or pre-order. He also asked for changes that make the site more appealing, bring visitors back and generally work better.

Diagnosis, which Jack agreed with: the fake feeling comes mostly from the cartoon SVG bottles and flat color blocks. Established food brands are built on real photography.

## Goals

1. A dark, warm, premium look based on mockup **B "After dark"** (canvas: https://claude.ai/artifact/8qKSzdMYzqHkqGKawoYJtc).
2. Real photography of grills, wings, tacos and similar food in place of the drawn bottles. Use free stock photos now. Jack adds real bottle photos before launch.
3. A **skit video strip** to show the brand's personality (from mockup C).
4. Features that turn a one-time visitor into a sign-up and bring them back (see Retention).
5. Better speed, link previews when the site is shared, and better SEO basics.

## Non-goals

- No move to Shopify. That happens when the first batch ships.
- No new pages. The site keeps home, pre-order and request a store.
- No change to how forms submit. Same FormSubmit endpoint, same field names, same email subjects, same thank-you and fallback behavior.
- No rewrite of the brand copy beyond what the new layout needs.

## Anti-goals (a failure even if it technically works)

- **The site looks AI-made or fake.** No code-drawn bottles in the hero, no gray placeholder boxes, no gradient blobs standing in for photos. If real content doesn't exist yet, hide that section. Never show a placeholder.
- **Any sauce recipe or ingredient amounts appear anywhere.** The recipes are secret, and the product is buy-only-from-us. Legally required allergen info is fine. The current FAQ line stays.
- **The brand is framed as a father-son company.** It's fully Jack's company. The "dad who cooks" humor aimed at customers stays, because it is the brand voice. Nothing says the company is run by Jack and his dad.
- **A form stops reaching the brand Gmail.** That would lose real leads.
- **Promises the site can't keep.** No hard ship date, discount or perk that isn't already on the site.

## Constraints

- Static site: plain HTML, CSS and JS in repo jacktriconi714-rgb/every-other-weekend-, deployed by Netlify from `main`. No build step today. Keep it that way.
- Forms post to `formsubmit.co/ajax/everyotherweekendsauce@gmail.com` (see `eow.js`). Activation is per web address, and the current address is already activated. A Netlify deploy preview is a different address, so form tests on a preview need a one-time activation click or a mocked endpoint.
- Work goes on a branch with a PR. Netlify builds a preview link for Jack to approve before merge. Merging is Jack's call.
- Stock photos must have a free commercial license (Unsplash or Pexels license). Download, resize and store them in the repo. Don't hotlink. The build workspace currently blocks those sites, so the network allowance must be approved first.
- US spelling ("flavor"). Prices and facts come only from the current site: $7.99 per 12 fl oz, $0 due today, three flavors.

## Approaches considered

1. **Restyle the current site in place.** Picked by Jack. Same three pages, same forms. New visual system, real photos, new sections. Lowest risk because the tested forms keep working.
2. **Rebuild from scratch** with a new structure, such as one long page. More work, every form needs re-testing, and nothing gained over option 1.
3. **Move to Shopify now.** Ruled out because it conflicts with the plan to move when the first batch ships, so the work would be done twice.

## The design

### Look (from mockup B)

Take only the **colors, type, warm glow and nav** from mockup B. Don't use its drawn bottles, countdown, new headline, or its "launch-day pricing" perk line.

- Colors: background `#0F0D0C`, raised surfaces `#1A1614`, text `#F4EDE2`, muted text `#BFB4A6`, ember accent `#E2582B` (buttons) and `#F08A4B` (small highlights). Warm radial "spotlight" glow behind hero images. Every text and background pair must meet 4.5:1 contrast. Body text on the dark background passes easily. Check muted text and button text.
- Type: Inter Tight. Headings 800–900 weight, uppercase and tight. Body 400–500. It replaces Bowlby One and DM Sans.
- Flavor colors stay as accents: Original cream `#E4DCC4`, Grill Master chipotle `#A9461C`, Smoke Alarm red `#D13A22`.
- Photos are full-bleed or in large rounded frames, with a subtle dark gradient where text sits on top.

### Home page (`index.html`) sections, top to bottom

1. **Nav:** wordmark, Flavors, Story, Request a store, and a "Pre-order" button.
2. **Hero:** large real food photo (grill or wings) with the warm glow. Keep the existing headline ("Good on everything. Even his cooking."), one line of copy, a "Reserve bottles · $0 today" button, and an inline **email-only sign-up** ("Get first dibs"). It posts to the same FormSubmit endpoint with the same "Pre-sale list: their@email" subject. Name, ZIP and flavor are left blank, so mark it in the email, for example with a hidden `source: hero` field. The full four-field form stays at the bottom of the page.
3. **Flavors:** one card per flavor with a real food photo of what it goes on (Original: tenders or fries. Grill Master: burgers or ribs. Smoke Alarm: wings or pizza), the existing name, tagline and "good on" tags, $7.99 and a pre-order link. Each card has a **bottle photo slot** that stays hidden until a file exists (see Bottle photos).
4. **Skit video strip:** a row of vertical video cards, each a poster image linking to the TikTok or Instagram post, plus a "Follow @everyotherweekend" link. **Hidden until at least one video is listed** in a single config list in `eow.js`.
5. **Dad's Rules and Story:** existing copy restyled.
   Existing sections not named here (the scrolling tagline strip, the "48 hours, two hungry kids" line, and the "Still learning? / Already a great cook?" pair) stay with their current copy, restyled to the new look.
6. **FAQ:** existing.
7. **Pre-sale list and footer:** existing form, restyled.

### Pre-order (`preorder.html`) and Request a store (`stores.html`)

Same look and fonts as the home page, plus one real photo band at the top. Form fields, logic and messages don't change.

### Retention and conversion features

All of them work on a static site with no new services.

- **Email capture in the hero**, not only at the bottom.
- **Share after sign-up:** the thank-you message adds "Know someone who grills? Send them this", using the phone's share sheet or copy-link.
- **Reservation counter:** "X bottles reserved from Batch 001." The number comes from one value in `eow.js`, set by hand. **Hidden while the value is 0**, so the site never shows an empty or made-up number. No total and no progress bar until Jack confirms the real first-batch size, which depends on co-packer minimums. Add one optional total value that turns it into a progress bar when set.
- **"Target: spring 2027"** shown as a target, not a countdown to a hard date. Per the posting rule, no ship-date promises.
- **Sticky mobile button:** a slim "Pre-order · $0 today" bar on phones once the visitor scrolls past the hero.
- **Fresh content reason to return:** the video strip, newest first, updated as skits post.

### Bottle photos

Each flavor has a fixed file path, such as `img/bottle-original.webp`. Bottles are hidden until those files exist, using a config flag in `eow.js` or by checking the image loads. When Jack sends photos, they're dropped in and the flag is switched on. No drawn bottles appear anywhere once this ships. The old SVG bottles and pour animation are removed.

### Speed, sharing and SEO

- Photos resized to the size they display at (hero about 1800px wide, cards about 900px), saved as WebP with JPEG fallback, about 250 KB or less each, lazy-loaded below the hero, with `width` and `height` set and real alt text.
- Open Graph and Twitter meta tags with a 1200×630 share image, so links in bios, texts and DMs show a real preview. Add a favicon and a page title and description for each page.
- Keep total home page weight under about 2 MB on first load.
- Absolute URLs (share image, share link) use `https://everyotherweekendco.netlify.app` until a custom domain exists. Keep the domain in one place so it's a one-line change later.

### Photo access and order of work

Restyle first: colors, type, layout, removing the SVG bottles. Then add photos. The preview link goes to Jack only once real photos are in, because a photo-free hero would look unfinished. If stock photo access isn't approved, Jack can send his own food photos instead and they go in the same slots.

## Decided by Jack

- Option 1 (restyle in place). Colors from mockup B. Video strip from mockup C. Real food photos now and real bottle photos later. Recipes never shown. No father-son framing.

## Calls made by Claude (Jack can override)

- Inter Tight replaces Bowlby One and DM Sans, to match mockup B.
- Existing copy is kept, including the dad-humor voice aimed at customers.
- Video strip, progress bar and bottle photos are hidden until real content exists, instead of showing placeholders.
- A spring 2027 target, not a countdown.
- Hero sign-up is email-only. The full form stays at the bottom.
- Reservation counter shows a count with no total until the batch size is confirmed.
- Only the colors, type, glow and nav come from mockup B. The current headline is kept.
- Unlisted home sections are kept and restyled.
- No analytics added for now. Netlify Analytics costs money, and a free option can be added later if Jack wants numbers.

## Left to the builder

- Exact photo choices within the subjects above, cropping and layout spacing.
- Whether bottles are shown by a config flag or an image-load check.
- Implementing the sticky mobile bar and the share button.
