# Design source of truth

## Current state: the Figma file could not be read

The design was specified as:

<https://www.figma.com/design/BNqGvY4f6i1ZZXHYFdjQRv/Website-2?node-id=0-1&p=f>

That URL requires a Figma login, so the layout, spacing, fonts and colours could not be
read from it (attempted 2026-07-14). **No design decisions were guessed from it.**

Instead the UI was built to the **written** design spec that accompanied the brief — the
"Cyber Setup / Dark Gaming Lifestyle" theme, including the exact palette, the button and
card rules, and the per-style colour vibes. That palette is implemented in
`src/styles/theme.css`.

## To apply the real Figma design

Drop exported frames into this folder and say so — the UI will be restyled to match.

**What is most useful, in order:**

1. **PNG exports of each frame** (Home, Quiz, Recommendation, Learning Center, Saved
   Builds), at 2x. Name them `home.png`, `quiz.png`, etc.
2. **The colour styles** — a screenshot of the Figma colour palette panel, or just the
   hex codes.
3. **The text styles** — font family, sizes and weights for headings and body.
4. **A navbar and footer frame**, and one card + one button component, close up.

Screenshots of the Figma canvas are fine. Anything readable works — the point is to see
the real spacing, type scale and colour, rather than infer them.

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
