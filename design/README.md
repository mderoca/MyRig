# Design source of truth

## What was taken from the Figma, and what was not

The Figma:
<https://www.figma.com/design/BNqGvY4f6i1ZZXHYFdjQRv/Website-2?node-id=0-1>

It was reviewed from a screenshot on 2026-07-14. (The file is publicly viewable, but Figma
renders designs on a `<canvas>` via JavaScript, so fetching the page yields no layout or
colour data, and the REST API needs a token. A screenshot was the practical route.)

### Taken from it — the structure and the brand

- **The page set.** The Figma is a *store*: Homepage, Can I Run It?, Login, Register, Store,
  Builder, Saved Builds, Wishlist, Orders, Account. That is what the app now is, and it is
  why real authentication exists.
- **The brand.** MYRIG wordmark, the "MR" monogram (`src/components/Logo.vue`), and the
  tagline **"Design the rig that fits you"**.
- **The floating pill navbar** — logo left, links centre, account and cart right.
- **The split-screen auth layout** — dark hero panel left carrying the wordmark and tagline,
  form right (`src/components/AuthLayout.vue`).
- **The three-column footer** — Get Started / Explore / Resources, with a social row.
- **The Saved Builds and Orders card layouts** — name and status left, component chips, item
  count and total right-aligned.
- **Image placeholders.** The Figma uses grey placeholder blocks rather than product
  photography, so `ProductCard.vue` renders a styled placeholder tile. Inventing stock
  product photos would have been worse than none.

### NOT taken from it — the colours

**The Figma frames are greyscale wireframes.** They do not define a palette. Only the
Login/Register frame is coloured, and it shows a near-black background with cyan/blue neon
and white type.

The written brief says: *"If the Figma colors are available, use them first. If the Figma
file does not clearly define all colors, use this theme"* — followed by the full "Cyber
Setup / Dark Gaming Lifestyle" palette. Since the Figma does **not** clearly define colours,
that written palette is what is implemented, and it is consistent with the one coloured
frame.

**If the intended design is actually light** (white pages, black navbar — which is one way to
read the wireframes), say so and it will be re-themed. That is a change to
`src/styles/theme.css` and little else.

## To refine the design further

Drop exported frames into this folder and say so.

1. **PNG exports of each frame**, at 2x. Name them `home.png`, `store.png`, etc.
2. **The colour styles** — a screenshot of the Figma colour palette panel, or the hex codes.
3. **The text styles** — font family, sizes and weights for headings and body.

## Where the design lives in the code

Everything is driven by CSS custom properties. There are **no hardcoded hex colours in
components** — re-skinning means editing tokens, not hunting through 20 files.

| File | Owns |
|---|---|
| `src/styles/theme.css` | Every colour, radius, shadow, spacing step and font stack. Also the six per-style accent themes (`[data-style="rgb"]`, `[data-style="cozy"]`, …). |
| `src/styles/main.css` | The reset and the shared classes: `.container`, `.card`, `.btn`, `.tag`, `.input`, `.grid`. |
| Each `.vue` file | A `<style scoped>` block for that component only, referencing the tokens above. |

### The colour language used throughout

Keep this consistent if you restyle — the UI relies on it to mean something:

- **Purple (`--primary`)** — main actions: Start Setup Quiz, Generate Setup, Save Build.
- **Cyan (`--secondary`)** — selection and emphasis: selected games, active quiz options,
  score accents, tags.
- **Green (`--success`)** — good scores, under budget.
- **Orange (`--warning`)** — close to budget, over budget, high-priority upgrades.

### Fonts

Loaded from Google Fonts in `index.html`: **Space Grotesk** for headings, **Inter** for
body. Swap both there and in `--font-display` / `--font-body` in `theme.css`.
