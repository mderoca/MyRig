# MyRig

**A beginner-friendly gaming PC and setup lifestyle planner, built with Vue 3.**

You tell MyRig which games you play, what you can spend, and how you want the desk to
look. It gives you back a complete gaming setup: the PC, the screen, the peripherals,
the accessories, what it all costs, how good it is out of 100, and what to upgrade next.

Built as a school course project. It demonstrates Vue.js as the main framework, plus an
external API (RAWG), a database (Neon Postgres), and deployment (Vercel).

**Current state:** feature-complete and building. The recommendation engine is verified
by a scripted check (see [Testing](#testing)). The RAWG and Neon paths have not been run
against live credentials yet — see [Open questions](#open-questions).

---

## How MyRig is different from PCPartPicker

PCPartPicker focuses on PC parts, prices and compatibility. That is a solved problem, and
MyRig does not try to solve it again — it does no compatibility checking and uses sample
prices, not live retail prices.

> **PCPartPicker helps users build a PC.
> MyRig helps users design a full gaming setup based on what games they play, their
> budget, and their setup style.**

Concretely, MyRig has six things PCPartPicker does not:

| | What it means |
|---|---|
| **Game-first recommendations** | The build starts from your actual games. Their RAWG genres and tags decide whether you need frames or fidelity. |
| **Full setup budget** | Your budget covers the whole desk — monitor, keyboard, mouse, headset, lighting, decor — not just the tower. |
| **Setup style picker** | RGB / minimalist / white / cozy / streamer / esports changes the case, the peripherals and the lighting. |
| **Beginner learning area** | Plain-language explanations of every part, and inline notes next to each recommendation. |
| **Setup scores** | Five scores out of 100, each with its reasoning written out. |
| **Upgrade path** | What to buy next, in what order, roughly what it costs, and why. |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build tool | Vite 6 |
| Routing | Vue Router 4 |
| State | Pinia |
| Styling | Plain CSS with custom properties (no Tailwind) |
| External API | [RAWG Video Games API](https://rawg.io/apidocs) |
| Database | [Neon](https://neon.tech) Postgres, via `@neondatabase/serverless` |
| Backend | Vercel serverless functions (`/api`) |
| Hosting | Vercel |
| Auth | None. A demo user id in `localStorage`. |

**Why plain CSS and not Tailwind:** every colour in the app comes from a variable in
`src/styles/theme.css`. Re-skinning the app to match an updated design means editing one
file, not hunting utility classes through 20 components.

---

## Run it locally

```bash
cd D:\HemlockOakProjects\MyRig
npm install
cp .env.example .env      # then fill in the two values below
npm run db:setup          # creates the tables in Neon and seeds them
npm run dev               # http://localhost:5173
```

`npm run dev` serves the frontend **and** the `/api` routes. You do **not** need the
Vercel CLI — `vite.config.js` contains a small middleware (`vercelApiDevServer`) that
runs the files in `/api` locally with the same `req.query` / `req.body` /
`res.status().json()` contract Vercel gives them in production.

### Environment variables

Both are **server-side only**. Neither is ever sent to the browser.

| Name | Where to get it | Used by |
|---|---|---|
| `RAWG_API_KEY` | Free key from <https://rawg.io/apidocs> | `api/_lib/rawg.js` |
| `DATABASE_URL` | Neon dashboard → your project → *Connection string* (use the **pooled** one) | `db/connection.js` |

Put them in `.env` for local dev, and in **Vercel → Project → Settings → Environment
Variables** for production. `.env` is gitignored; never commit it.

### What "working" looks like

- `npm run build` → `✓ built in ~600ms`, writes `dist/`.
- `curl "http://localhost:5173/api/games/search?q=valorant"` → `{"query":"valorant","count":12,"games":[...]}`
- Without the env vars set, every route fails **loudly and clearly** rather than crashing:
  ```
  GET /api/parts        → 503 {"error":"The database is not configured. Set DATABASE_URL and run `npm run db:setup`. ..."}
  GET /api/games/search → 500 {"error":"RAWG_API_KEY is not set on the server. ..."}
  ```

---

## Set up Neon

1. Create a free project at <https://neon.tech>. (Verified 2026-07-14 — re-check the free
   tier before relying on it.)
2. Copy the **pooled** connection string into `DATABASE_URL` in `.env`.
3. Run `npm run db:setup`.

That script (`db/setup.js`) applies `db/schema.sql`, then seeds `parts`, `accessories`,
`learning_cards` and `upgrade_rules` from `db/catalog.js`. Expected output:

```
Applying schema...
Seeding parts...
...
Done. Seeded 22 parts, 18 accessories, 9 learning cards, 25 upgrade rules.
```

**`db/catalog.js` is the single source of truth for catalog data.** To change what MyRig
recommends, edit that file and re-run `npm run db:setup`. `db/seed.sql` is a *generated*
file (`npm run db:gen-seed`) — it exists so you can paste the data straight into the Neon
SQL Editor without Node. Do not hand-edit it.

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it at <https://vercel.com/new>. Vercel detects Vite from `vercel.json`.
3. Add `RAWG_API_KEY` and `DATABASE_URL` under **Settings → Environment Variables**.
4. Deploy. Files in `/api` become serverless functions automatically; everything else is
   served as a static SPA.

`vercel.json` rewrites every non-`/api` path to `index.html` so Vue Router's history mode
works on a hard refresh of `/quiz`, `/builds`, etc.

---

## Project structure

```
src/
  components/   Navbar, Footer, GameSearch, SelectedGames, RecommendationCard,
                BudgetBreakdown, StyleSummary, LearningCard, SetupScores, ScoreCard,
                UpgradePath, UpgradeCard, BuildSummary, LoadingState, ErrorMessage
  pages/        HomePage, SetupQuizPage, RecommendationPage, LearningCenterPage,
                SavedBuildsPage
  router/       index.js      route table + the guard that blocks /recommendation
                              when no setup has been generated
  stores/       setupStore.js Pinia store: quiz answers + generated setup, mirrored
                              into localStorage so a refresh does not lose the result
  services/     api.js        the ONLY place the frontend touches the network
                user.js       the localStorage demo user id
  styles/       theme.css     every colour, radius and spacing token
                main.css      reset + shared classes (.card, .btn, .tag, .container)

api/            Vercel serverless functions
  _lib/         engine.js     the recommendation engine (pure functions)
                rawg.js       server-side RAWG client — holds the API key
                catalog.js    loads the catalog tables out of Neon
  games/
    search.js   GET  /api/games/search?q=...
    [id].js     GET  /api/games/:id
  parts.js      GET  /api/parts
  recommend.js  POST /api/recommend
  builds.js     GET / POST / DELETE /api/builds

db/
  catalog.js    SOURCE OF TRUTH for parts, accessories, learning cards, upgrade rules
  schema.sql    the five tables
  seed.sql      GENERATED from catalog.js — do not hand-edit
  connection.js the Neon client
  setup.js      npm run db:setup
```

**Files under `api/` whose name starts with `_` are helper modules, not endpoints** —
Vercel does not turn them into functions. That is why the engine lives in `api/_lib/`.

---

## API routes

| Route | Does |
|---|---|
| `GET /api/games/search?q=valorant` | Searches RAWG. Returns `{ id, name, image, rating, genres, platforms, tags }` per game. |
| `GET /api/games/:id` | Optional detail route: description, screenshots, metacritic. |
| `GET /api/parts` | Returns the whole catalog from Neon: `parts`, `accessories`, `learningCards`, `upgradeRules`. The Learning Center reads its cards from here. |
| `POST /api/recommend` | Takes the quiz answers, runs the engine against the Neon catalog, returns `{ meta, items, budget, scores, styleSummary, upgradePath }`. |
| `GET /api/builds?userId=...` | That demo user's saved builds, newest first. |
| `POST /api/builds` | Saves a build. |
| `DELETE /api/builds?id=..&userId=..` | Deletes one of that user's builds. |

**The frontend never calls RAWG directly.** It has no key. Every game search goes through
`/api/games/search`, which reads `RAWG_API_KEY` inside the serverless function. This is
the whole reason the API routes exist — a key in the browser bundle is a key that has been
given away.

---

## Database tables

| Table | Holds |
|---|---|
| `parts` | CPU, GPU, RAM, storage, case, monitor. Has a `tier` (`budget`/`mid`/`high`/`ultra`), plus `best_for[]` (which gaming goals it suits) and `styles[]` (which setup styles it suits). |
| `accessories` | Everything outside the tower: keyboard, mouse, headset, microphone, webcam, lighting, desk. Same `best_for` / `styles` idea, no tier. |
| `learning_cards` | Two explanations per concept — a short one and a beginner one. Powers both the Learning Center page and the inline beginner notes. |
| `upgrade_rules` | Rules that produce the Upgrade Path. A rule fires when the build's `condition_type` (`budget_tier` / `gaming_goal` / `setup_style`) equals its `condition_value`. |
| `saved_builds` | One row per saved build. `selected_games`, `recommended_items`, `scores` and `upgrade_path` are `JSONB`. Keyed by `user_id`. |

---

## How the recommendation logic works

All of it is in `api/_lib/engine.js`. It is deliberately **rule-based, not AI** — pure
functions of the inputs, so the same quiz always produces the same setup. That makes it
demoable and explainable.

1. **Read the games.** `readGameSignal()` scans the RAWG genres and tags of the selected
   games and scores them as *competitive*, *graphics* or *casual*.
2. **Pick target tiers.** The budget sets a baseline tier; the gaming goal bumps the
   categories that goal depends on (competitive → faster monitor, streaming → stronger
   CPU, high graphics → stronger GPU); the game signal nudges it further.
3. **Reserve money for the setup, before the tower spends it all.** This is the core
   argument of the app. A streaming setup needs a microphone more than a faster GPU, and a
   cozy setup with no lamp is not cozy. So that money comes off the table *first* —
   otherwise the tower always wins and you have built a PC, not planned a setup.
4. **Pick each core part.** Every candidate is scored on goal fit + style fit + tier fit +
   affordability, and the best wins.
5. **Spend the leftovers.** `upgradePass()` moves parts up a tier in the order the goal
   cares about. A build that lands at 70% of budget is not a good build, it is an
   unfinished one. An upgrade is only allowed if it does not make goal or style fit worse
   — that is what stops a casual build being "upgraded" into a GPU it will never use.
6. **Buy the extras**, essentials first, then style flourishes, until the money runs out.
7. **Score it** (five scores, each with a written explanation) and **build the upgrade
   path** from the matching `upgrade_rules`.

### Gotchas in the engine

- **Budget allocations are weighted per goal** (`GOAL_WEIGHTS`) and then *renormalised*.
  This moves money between categories; it does not invent any. Without it a fixed
  allocation starves the exact category the goal depends on — an early version could not
  afford the CPU that makes streaming work, or the 1440p monitor that makes "high
  graphics" mean anything. If you change `ALLOCATION`, re-run the engine check.
- **The upgrade pass must not raid the reserve.** It is given `coreBudget - spent`, not
  `cap - spent`. An earlier version handed it the whole leftover, and it spent the cozy
  setup's lamp money on a better GPU — producing a "cozy" build with nothing cozy in it
  (style score 45/100).
- `tier` ordering is `budget < mid < high < ultra`, defined by `TIER_ORDER`. Accessories
  have no tier and are treated as always on-tier.

---

## Testing

There is no test framework (deliberate — it is a small course project). There is a
scripted check of the engine, which is the only part with real logic:

```bash
npm run check     # scripts/engine-check.mjs — no database or network needed
```

It runs five representative quizzes end-to-end through `recommendSetup()` and asserts:
every core category is present, the total never exceeds budget by >5%, every setup
contains desk accessories (it is a *setup* planner), the chosen style actually appears in
the build, scores are in range with explanations, beginner notes appear only in beginner
mode, and — the important one — that **different goals produce different builds**
(competitive → 240Hz monitor; high graphics → 1440p + stronger GPU; streaming → strong CPU
+ mic + webcam).

Last run: **all checks passed**.

---

## Gotchas

- **`npm run db:setup` drops and recreates every table, including `saved_builds`.** It
  wipes saved builds. Fine for a demo; do not run it against anything you want to keep.
- **Postgres `NUMERIC` comes back from Neon as a *string*.** `api/_lib/catalog.js` maps
  prices back to numbers. If you add a numeric column, do the same or your prices will
  concatenate instead of add.
- **RAWG free keys are rate-limited.** `GameSearch.vue` debounces by 400ms so you get one
  request per search, not one per keystroke. Do not remove that.
- **There is no auth, by design.** `DELETE /api/builds` matches on **both** `id` and
  `user_id`, so one demo user cannot delete another's build by guessing a row id. That is
  demo-grade separation, not real authorisation — acceptable only because the app stores
  no personal data. Do not extend this pattern to anything that does.
- **The demo user id identifies a browser, not a person.** Clear site data and you are a
  new user with no builds. This is expected.
- **`db/seed.sql` is generated.** Edits to it are lost the next time anyone runs
  `npm run db:gen-seed`.

---

## How this project demonstrates Vue.js

- **Component architecture** — 15 reusable components and 5 pages; presentational
  components (`ScoreCard`, `UpgradeCard`, `RecommendationCard`) take props and stay dumb.
- **Composition API** with `<script setup>` throughout.
- **Reactivity** — `ref`, `computed` (e.g. the budget meter recomputes from the setup),
  and `watch` (the debounced game search in `GameSearch.vue`).
- **Vue Router** — five routes, history mode, a `beforeEach` guard that blocks
  `/recommendation` when no setup exists, and per-route page titles.
- **Pinia** — one store holding the quiz answers and the generated setup, mirrored into
  `localStorage` so the result survives a refresh.
- **Scoped styles** — every component styles itself; shared tokens come from CSS variables.
- **Conditional rendering and lists** — `v-if` / `v-for` drive loading, error and empty
  states on every page that touches the network.

---

## Open questions / not done

- **The RAWG and Neon paths have not been run against live credentials.** The routes,
  validation and error handling are verified; the happy path needs a real `RAWG_API_KEY`
  and `DATABASE_URL`. Run `npm run db:setup`, then search for a game in the quiz.
- **The Figma design has not been applied.** The Figma file is behind a login and could
  not be read, so the UI is built to the written design spec (the "Cyber Setup" dark
  theme). See `design/README.md` for how to supply the frames.
