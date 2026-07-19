# MyRig

**Design the rig that fits you.**

MyRig is two things sharing one catalog:

1. a **store** — browse parts and accessories, wishlist, cart, place orders, with real accounts; and
2. a **planner** — a quiz that recommends a whole gaming setup from the games you play, your budget and your style, with scores and an upgrade path.

The planner recommends things the store actually sells. That is the point of the design:
one `products` table, read by both.

Built as a school course project. It demonstrates Vue 3 as the main framework, plus an
external API (IGDB), a database (Neon Postgres), authentication, and deployment (Vercel).

**Current state:** feature-complete, building, and verified end to end against a live Neon
database and a live IGDB app. The recommendation engine and the auth layer are covered by
scripted checks (`npm run check`); the database-backed flows (register → login → browse →
wishlist → cart → order → save build) and the IGDB paths (search, game detail, "Can I Run
It?") have each been exercised for real. See [Open questions](#open-questions) for what is
still genuinely unproven.

---

## How MyRig is different from PCPartPicker

PCPartPicker focuses on PC parts, prices and compatibility. MyRig checks compatibility too —
socket, memory generation and power draw — but uses realistic *sample* prices rather than
live retail ones, so it does not compete on price tracking.

> **PCPartPicker helps users build a PC.
> MyRig helps users design a full gaming setup based on what games they play, their
> budget, and their setup style.**

| | What it means |
|---|---|
| **Game-first recommendations** | The build starts from your actual games. Their IGDB genres and tags decide whether you need frames or fidelity. |
| **Full setup budget** | Your budget covers the whole desk — monitor, keyboard, mouse, headset, lighting, decor — not just the tower. |
| **Setup style picker** | RGB / minimalist / white / cozy / streamer / esports changes the case, the peripherals and the lighting. |
| **Beginner learning area** | Plain-language explanations of every part, and inline notes next to each recommendation. |
| **Setup scores** | Five scores out of 100, each with its reasoning written out. |
| **Upgrade path** | What to buy next, in what order, roughly what it costs, and why. |
| **Can I Run It?** | Search a real game; MyRig works out what it needs and what that rig costs. |
| **Compatibility is a hard constraint** | The CPU always fits the motherboard, the memory always matches the board, and the PSU always covers the draw with headroom. Incompatible parts are filtered out *before* scoring, so an unassemblable build cannot be produced — see [Compatibility](#compatibility). |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build tool | Vite 6 |
| Routing | Vue Router 4, with auth guards |
| State | Pinia (`auth`, `cart`, `setup`) |
| Styling | Plain CSS with custom properties (no Tailwind) |
| External API | [IGDB](https://api-docs.igdb.com) — owned by Twitch, so auth is a Twitch app |
| Database | [Neon](https://neon.tech) Postgres, via `@neondatabase/serverless` |
| Backend | Vercel serverless functions (`/api`) |
| Auth | Email + password — `bcryptjs` hashing, `jose` JWT in an httpOnly cookie |
| Hosting | Vercel |

**Why plain CSS and not Tailwind:** every colour lives in `src/styles/theme.css`. Re-skinning
the app means editing one file, not hunting utility classes through 30 components.

---

## Run it locally

### Prerequisites

| | |
|---|---|
| **Node.js 18 or newer** | Check with `node -v`. Developed on v24.13.0. Get it from <https://nodejs.org>. |
| **npm** | Ships with Node. Check with `npm -v`. |
| **A Neon account** | Free. <https://neon.tech> — this is where the database lives. |
| **A Twitch app (for IGDB)** | Free. <https://dev.twitch.tv/console/apps> — this is where game search comes from. Gives you a Client ID and a Client Secret. |

You do **not** need the Vercel CLI, Docker, or a local Postgres install.

### Step 1 — Get the code and install dependencies

```bash
git clone https://github.com/mderoca/MyRig.git
cd MyRig
npm install
```

That installs six runtime dependencies (`vue`, `vue-router`, `pinia`,
`@neondatabase/serverless`, `bcryptjs`, `jose`) and three build ones (`vite`,
`@vitejs/plugin-vue`, `dotenv`). It takes a few seconds and needs no global installs.

### Step 2 — Create your `.env`

Copy the template and fill in the four values:

```bash
cp .env.example .env      # Windows PowerShell: copy .env.example .env
```

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard → your project → **Connection string** → use the **pooled** one. Looks like `postgresql://user:pass@host/db?sslmode=require`. |
| `IGDB_CLIENT_ID` | <https://dev.twitch.tv/console/apps> → **Register Your Application** (OAuth Redirect URL `http://localhost`, category "Application Integration"). The Client ID is shown on the app. |
| `IGDB_CLIENT_SECRET` | Same app → **New Secret**. Shown once — copy it immediately. |
| `AUTH_SECRET` | Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output. |

All four are **server-side only** — they are read inside the API routes and never sent to
the browser. `AUTH_SECRET` signs the session cookies and must be **at least 32 characters**;
the app refuses to start a session otherwise.

`.env` is gitignored. **Never commit it.**

### Step 3 — Create the database tables

```bash
npm run db:setup
```

(That is the first-run command. Afterwards, when you change `db/catalog.js`, use
`npm run db:reseed` — it reloads the catalog without dropping your account.)

Expected output:

```
Applying schema...
Seeding products...
Seeding learning cards...
Seeding upgrade rules...

Done. Seeded 49 products, 11 learning cards, 25 upgrade rules.
Register an account in the app to create your first user.
```

### Step 4 — Run it

```bash
npm run dev
```

Open **<http://localhost:5173>**.

`npm run dev` serves the frontend **and** the `/api` routes together. `vite.config.js`
contains a middleware (`vercelApiDevServer`) that runs the files in `/api` locally with the
same `req.query` / `req.body` / `res.status().json()` contract Vercel gives them in
production — which is why the Vercel CLI is not needed.

There is no seeded user. **Register an account in the app** to create the first one.

### Verify it is actually working

```bash
npm run check     # engine check (5 quizzes) + auth check (27 assertions) — no DB needed
npm run build     # should print: ✓ built in ~600ms
```

Then in the browser: register an account → search a game in the quiz → generate a setup →
add it to the cart → place an order. If all five work, everything is wired up.

### If something is not working

| Symptom | Cause |
|---|---|
| Pages load, but the shop/quiz show *"The database is not configured"* | `DATABASE_URL` missing from `.env`, or `npm run db:setup` was never run. |
| **Registered fine, but cannot sign in afterwards** | Someone ran `npm run db:setup` in between — it DROPs `users`. Register again, and use `npm run db:reseed` for catalog changes from now on. |
| Game search says *"IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are not set"* | One or both missing from `.env`. |
| Game search says *"Twitch rejected the IGDB credentials"* | The id/secret pair is wrong, or the secret was regenerated in the Twitch console. |
| Game search returns an empty list for everything | An IGDB field was probably renamed. A bad field in a `where` clause returns `[]` rather than an error — see `searchGames()` in `api/_lib/igdb.js`. |
| Sign-in fails with a 500 about `AUTH_SECRET` | `AUTH_SECRET` missing, or shorter than 32 characters. |
| Changed `.env` but nothing happened | Restart `npm run dev` — env vars are read at startup. |
| `relation "products" does not exist` | Run `npm run db:setup`. |

Every route fails loudly rather than silently when config is missing — that is deliberate:

```
GET  /api/products     → 503 {"error":"The database is not configured. ..."}
POST /api/auth/login   → 503 {"error":"The database is not configured. ..."}
GET  /api/auth/me      → 200 {"user":null}      # being signed out is not an error
```

### All the npm scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server + API routes on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` (no API routes) |
| `npm run check` | Both checks below |
| `npm run check:engine` | 5 quizzes through the recommendation engine |
| `npm run check:auth` | 27 assertions on hashing, sessions, CSRF |
| `npm run db:reseed` | **Reload the catalog, keep accounts.** Run this after editing `db/catalog.js`. |
| `npm run db:setup` | Create + seed the tables. **DROPs everything, accounts included** — only for `schema.sql` changes. Refuses to run if it would delete real data; `-- --force` overrides. |
| `npm run db:gen-seed` | Regenerate `db/seed.sql` from `db/catalog.js` |

---

## Changing the catalog

Getting the database *running* is Steps 2–3 above. This is about changing what is *in* it.

**`db/catalog.js` is the single source of truth.** To change what MyRig sells or recommends,
edit that file and re-run `npm run db:setup`.

`db/seed.sql` is a **generated** file (`npm run db:gen-seed`). It exists so the catalog can
be pasted straight into the Neon SQL Editor without running Node. Do not hand-edit it —
your changes are lost the next time anyone regenerates it.

Neon's free tier was adequate for this project as of 2026-07-14 — re-check before relying
on it.

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it at <https://vercel.com/new>. Vercel detects Vite from `vercel.json`.
3. Add `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `DATABASE_URL` and `AUTH_SECRET` under **Settings → Environment
   Variables**, *before* the first build — otherwise it deploys fine and 503s on every
   data route. Use a **different** `AUTH_SECRET` than your local one: a token minted in dev
   should not be valid in production.
4. Deploy. Files in `/api` become serverless functions; everything else is a static SPA.

`vercel.json` rewrites every non-`/api` path to `index.html` so Vue Router's history mode
survives a hard refresh of `/shop`, `/orders`, etc.

### The 12-function budget

**Every file under `/api` becomes its own serverless function, and Vercel's Hobby plan
allows 12 per deployment.** Files under `api/_lib/` do not count — that is the whole reason
the engine, the IGDB client and the auth handlers live there.

The project currently uses **10**:

```
auth/[action]  builds  can-i-run  games/[id]  games/search
learning  orders  products  recommend  wishlist
```

`api/auth/[action].js` is one function serving `/api/auth/register`, `/login`, `/logout`
and `/me`. As four separate files the project sat at 13 and the build failed before
deploying anything. **Adding two more route files will break the deploy again** — fold new
endpoints into an existing dynamic route rather than adding top-level files.

The session cookie gets the `Secure` flag automatically in production (it is omitted in dev
so it works over plain `http://localhost`). See `startSession()` in `api/_lib/auth.js`.

---

## Project structure

```
src/
  components/   Navbar, Footer, Logo, AuthLayout, ProductCard, GameSearch,
                SelectedGames, RecommendationCard, BudgetBreakdown, StyleSummary,
                CompatibilityPanel,
                LearningCard, SetupScores, ScoreCard, UpgradePath, UpgradeCard,
                BuildSummary, LoadingState, ErrorMessage
  pages/        Home, Store, CanIRunIt, Builder, SetupQuiz, Recommendation,
                LearningCenter, Cart, Login, Register, SavedBuilds, Wishlist,
                Orders, Account
  router/       index.js       routes + the guards (requiresAuth / guestOnly / requiresSetup)
  stores/       authStore.js   who is signed in
                cartStore.js   the cart (browser-only; see the warning below)
                setupStore.js  quiz answers + the generated setup
  services/     api.js         the ONLY place the frontend touches the network
  styles/       theme.css      every colour, radius and spacing token
                main.css       reset + shared classes

api/
  _lib/         auth.js        hashing, sessions, CSRF, rate limiting  <- security lives here
                auth-routes/   register.js login.js logout.js me.js — the four
                               handlers, dispatched by api/auth/[action].js
                engine.js      the recommendation engine (pure functions)
                igdb.js        server-side IGDB client — holds the credentials + token cache
                catalog.js     loads products out of Neon
  auth/         [action].js    ONE function for all four auth endpoints
  games/        search.js  [id].js
  products.js   learning.js  recommend.js  can-i-run.js  builds.js  wishlist.js  orders.js

db/
  catalog.js    SOURCE OF TRUTH for products, learning cards, upgrade rules
  schema.sql    the nine tables
  seed.sql      GENERATED from catalog.js — do not hand-edit
  connection.js the Neon client
  seed-catalog.js  the INSERTs, shared by both scripts below
  setup.js      npm run db:setup   — drops and rebuilds everything
  reseed.js     npm run db:reseed  — catalog only, keeps accounts

scripts/
  engine-check.mjs   npm run check:engine
  auth-check.mjs     npm run check:auth
```

**Files under `api/` whose name starts with `_` are helper modules, not endpoints** —
Vercel does not turn them into functions. That is why the engine and the auth library live
in `api/_lib/`.

---

## API routes

| Route | Auth | Does |
|---|---|---|
| `POST /api/auth/register` | — | Create an account, sign in. |
| `POST /api/auth/login` | — | Sign in. |
| `POST /api/auth/logout` | — | Clear the session cookie. |
| `GET /api/auth/me` | — | Who is signed in (`{user: null}` when nobody). |
| `GET /api/products` | — | The store catalog. Filters: `category`, `kind`, `q`, `min`, `max`, `sort`. |
| `GET /api/learning` | — | Learning Center cards. |
| `GET /api/games/search?q=` | — | Search IGDB. |
| `GET /api/games/:id` | — | One game in detail. |
| `POST /api/recommend` | — | Quiz answers → full setup, budget, scores, upgrade path. |
| `POST /api/can-i-run` | — | `{gameId}` → what that game needs and what it costs. |
| `GET/POST/DELETE /api/wishlist` | **yes** | The signed-in user's wishlist. |
| `GET/POST /api/orders` | **yes** | Order history; place an order. |
| `GET/POST/DELETE /api/builds` | **yes** | Saved setups from the quiz. |

**The frontend never calls IGDB or Neon directly.** It has no key for either. That is the
whole reason the API routes exist — a key in the browser bundle is a key you have given away.

---

## Database tables

| Table | Holds |
|---|---|
| `products` | **One catalog, two consumers.** Everything the store sells and everything the engine recommends. `kind` is `part` or `accessory`; only parts carry a `tier` (`budget`/`mid`/`high`/`ultra`). `best_for[]` and `styles[]` are what the engine matches on. `socket`, `ram_type`, `tdp` and `wattage` drive compatibility and are NULL wherever they do not apply. |
| `learning_cards` | Two explanations per concept — short, and beginner. Powers the Learning Center *and* the inline beginner notes. |
| `upgrade_rules` | Rules producing the Upgrade Path. A rule fires when the build's `condition_type` (`budget_tier`/`gaming_goal`/`setup_style`) equals its `condition_value`. |
| `users` | `email` (lower-cased, unique), `password_hash` (bcrypt — never plaintext), `display_name`. Nothing else: no address, no phone, no payment data. |
| `rate_limits` | Login/register throttling. In the database, not in memory — see Gotchas. |
| `wishlist` | `UNIQUE(user_id, product_id)`, so adding twice is a no-op rather than a duplicate. |
| `orders` / `order_items` | Simulated checkout. Line items **copy** the name and price at time of order, so an order still shows what was paid even after the catalog price changes. |
| `saved_builds` | A snapshot of a generated setup (`JSONB` for items, scores, upgrade path), so it still renders correctly after the catalog or the rules change. |

Everything user-owned is `ON DELETE CASCADE` from `users` — deleting a user takes their
wishlist, orders and builds with them, leaving no orphans.

---

## Security

The security-critical code is `api/_lib/auth.js`. Each control, and where it lives:

- **Passwords are bcrypt-hashed** (cost 10), never stored or logged in plaintext —
  `hashPassword()`. `publicUser()` is the only shape of a user that reaches the browser,
  and it cannot contain the hash.
- **The session is an httpOnly cookie**, not localStorage — `startSession()`. A JWT in
  localStorage is readable by any XSS on the page; an httpOnly cookie is not readable by
  JavaScript at all.
- **CSRF: `SameSite=Lax`** means the browser will not attach the session cookie to a
  cross-site POST/DELETE. `assertSameOrigin()` is a second check on the `Origin` header,
  called by every state-changing route.
- **Login does not leak which emails exist.** The failure message is identical either way,
  and `verifyPassword()` runs bcrypt against a dummy hash when the user is not found, so a
  miss costs the same time as a hit.
- **Rate limiting** on login (8 / 15 min) and register (5 / hour) — `rateLimit()`.
- **Authorization, not just authentication.** Every route that touches user data takes the
  user id **from the session cookie, never from the request**, and scopes its query by it.
  `DELETE /api/builds?id=7` matches on `id AND user_id`, so someone else's build id returns
  404, not their build.
- **Prices come from the database, never the request.** `POST /api/orders` accepts only
  product ids and quantities and looks every price up itself. If it trusted a client-sent
  price, anyone could buy an RTX for a cent.
- **Every query is parameterized** via the `sql` tagged template — no string concatenation
  anywhere, including the store's search and filters.

`npm run check:auth` asserts most of the above (27 checks: hashing, salting, timing,
validation, cookie flags, token tampering, the CSRF matrix, and that no hash escapes to the
browser).

### Not done, and honest about it

- **No email verification and no password reset.** You cannot recover an account.
- **No CAPTCHA** on registration; rate limiting is the only abuse control.
- **Checkout is simulated.** No payment provider, no card details, no PCI surface.
- The rate limiter has a **race window** — two simultaneous requests can both read the
  count before either writes. It is not a hard guarantee, just a throttle.

---

## Compatibility

MyRig will not recommend a build that cannot be assembled. Three rules, all in
`api/_lib/engine.js`:

| Rule | Means |
|---|---|
| **Socket** | The CPU's socket must equal the motherboard's (`AM4`, `AM5`, `LGA1700`). |
| **Memory** | The RAM's generation must equal the motherboard's (`DDR4`, `DDR5`). |
| **Power** | The PSU's wattage must cover CPU tdp + GPU tdp + 100W of system overhead, times 1.25 for headroom. |

These are **hard constraints, not warnings**. `isCompatible()` filters candidates *before*
`pickItem()` scores them, so an incompatible part is never in contention. After the upgrade
pass, `fitPowerSupply()` re-sizes the PSU to whatever the build actually became — the pass
can swap in a much hungrier GPU than the one the original PSU was chosen for.

`checkCompatibility()` then re-derives the verdict from the finished item list. That is
deliberately a **separate pass** rather than a flag set during selection: if the filtering
ever has a bug, the check catches it instead of inheriting it. Its output is what
`CompatibilityPanel.vue` renders and what `npm run check:engine` asserts.

**What is NOT checked**, and is not claimed to be: case clearance, GPU length, cooler
height, BIOS revision. `checkCompatibility()` returns these in a `notChecked` array and the
UI prints them, so "compatible" always means *these three things were verified* rather than
an unqualified promise.

### Gotchas

- **A part with a `NULL` compatibility field is unconstrained.** That is why a keyboard
  never blocks a build. If you add a CPU on a new socket, **add a motherboard for it too** —
  otherwise the filter empties the motherboard pool and that CPU can never be picked.
- **`ALLOCATION`'s key order is load-bearing.** The selection loop walks it in order and the
  rules are dependent: the board is filtered by the CPU's socket, the RAM by the board's
  memory type. Put `motherboard` before `cpu` and the socket filter has nothing to filter
  against.
- **The budget caps rose ~$150 per tier when this landed.** A build now has to include a
  motherboard and a PSU, which it always really needed. At the old $900 cap the extra parts
  pushed every desk accessory out of the budget — which broke the one thing MyRig claims
  over PCPartPicker.
- **`'Intel i7 / Ryzen 7 Class CPU'` had to be split** into separate Intel and AMD products.
  One part cannot be both `LGA1700` and `AM5`.

---

## How the recommendation logic works

All of it is in `api/_lib/engine.js`. It is deliberately **rule-based, not AI** — pure
functions of the inputs, so the same quiz always produces the same setup. That makes it
demoable, debuggable and explainable.

1. **Read the games.** `readGameSignal()` scans the IGDB genres/tags of the selected games
   and scores them as *competitive*, *graphics* or *casual*.
2. **Pick target tiers.** The budget sets a baseline; the goal bumps the categories that
   goal depends on (competitive → faster monitor, streaming → stronger CPU, high graphics →
   stronger GPU); the games nudge it further.
3. **Reserve money for the setup before the tower spends it all.** This is the core
   argument of the app. A streaming setup needs a microphone more than a faster GPU, and a
   cozy setup with no lamp is not cozy. That money comes off the table *first* — otherwise
   the tower always wins and you have built a PC, not planned a setup.
4. **Pick each core part.** Incompatible candidates are filtered out FIRST — see
   [Compatibility](#compatibility) — then the survivors are scored on goal fit + style fit +
   tier fit + affordability, and the best wins. Order matters: the CPU is chosen before the
   motherboard, which is chosen before the RAM.
5. **Spend the leftovers.** `upgradePass()` moves parts up a tier in the order the goal
   cares about. A build landing at 70% of budget is not a good build, it is an unfinished
   one. An upgrade is only allowed if it does not make goal or style fit worse — that is
   what stops a casual build being "upgraded" into a GPU it will never use.
6. **Buy the extras**, essentials first, then style flourishes, until the money runs out.
   The power supply is re-fitted to the finished build before this, because the upgrade pass
   may have swapped in a much hungrier GPU than the one it was originally sized for.
7. **Score it** (five scores, each with a written explanation) and **build the upgrade
   path** from the matching `upgrade_rules`.

`POST /api/can-i-run` reuses the same engine: it infers the goal from one game's tags and
returns a minimum and a recommended build.

### Gotchas in the engine

- **Budget allocations are weighted per goal** (`GOAL_WEIGHTS`) and then *renormalised* —
  this moves money between categories, it does not invent any. Without it, a fixed
  allocation starves the exact category the goal depends on: an early version could not
  afford the CPU that makes streaming work, or the 1440p monitor that makes "high graphics"
  mean anything. If you change `ALLOCATION`, re-run `npm run check:engine`.
- **The upgrade pass must not raid the reserve.** It is given `coreBudget - spent`, not
  `cap - spent`. An earlier version handed it the whole leftover and it spent the cozy
  setup's lamp money on a better GPU — producing a "cozy" build with nothing cozy in it
  (style score 45/100).
- `tier` ordering is `budget < mid < high < ultra` (`TIER_ORDER`). Accessories have no tier
  and are treated as always on-tier.

---

## Testing

No test framework (deliberate — small course project). Two scripted checks cover the parts
with real logic:

```bash
npm run check          # both
npm run check:engine   # 5 quizzes through the engine — no DB, no network needed
npm run check:auth     # 27 assertions on hashing, sessions, CSRF — no DB needed
```

`check:engine` asserts every core category is present, the total never blows the budget,
every setup contains desk accessories (it is a *setup* planner), the chosen style appears in
the build, scores are in range with explanations, beginner notes appear only in beginner
mode, and — the important one — that **different goals produce different builds**
(competitive → 240Hz; high graphics → 1440p + stronger GPU; streaming → strong CPU + mic +
webcam).

Last run: **both pass**.

---

## Gotchas

- **Editing the catalog? Use `npm run db:reseed`, not `db:setup`.** `db:setup` DROPs every
  table, `users` included, so it silently destroys accounts — and a registration that
  worked looks broken the moment you try to sign in afterwards. This bit us: three schema
  reseeds in one session wiped the test account each time. `db:setup` now counts users,
  orders and saved builds first and **refuses to run** if it would delete any (`-- --force`
  overrides); `db:reseed` replaces only the catalog.
- **`db:reseed` uses `DELETE`, not `TRUNCATE`, and that is deliberate.** `products` is
  referenced by `wishlist` and `order_items`, so Postgres will not TRUNCATE it without
  CASCADE — and `TRUNCATE ... CASCADE` empties those referencing tables completely, wiping
  every order line item in the database. `DELETE` respects the foreign keys as declared:
  wishlist rows cascade away (their product is gone), while `order_items.product_id` is
  `SET NULL` so **order history survives** — the line items kept the name and price paid.
  That is exactly why those columns are duplicated onto `order_items`.
- **Rate limiting must live in the database, not in memory.** Serverless functions do not
  share memory — an in-process counter resets on every cold start and throttles nothing.
  That is why the `rate_limits` table exists.
- **Postgres `NUMERIC` comes back from Neon as a *string*.** `withNumericPrice()` in
  `api/_lib/catalog.js` maps prices back to numbers. If you add a numeric column, do the
  same, or your prices will concatenate instead of add.
- **The cart is browser-only and its prices are display-only.** The server re-reads every
  price at checkout. Nothing a user edits in `localStorage` can change what they are
  charged.
- **IGDB rate-limits to 4 requests/second.** The game searches debounce by 400ms so you get one
  request per search, not one per keystroke. Do not remove that.
- **`db/seed.sql` is generated.** Edits to it are lost the next time anyone runs
  `npm run db:gen-seed`.
- **The Figma is a different app.** It shows a store with Login/Register/Store/Orders/
  Wishlist/Account, which is what drove this build; but its greyscale wireframes define no
  colours, so the dark "Cyber Setup" palette from the written brief is what is implemented.
  See `design/README.md`.

---

## How this project demonstrates Vue.js

- **Component architecture** — 18 components and 14 pages; presentational components
  (`ProductCard`, `ScoreCard`, `UpgradeCard`) take props and stay dumb.
- **Composition API** with `<script setup>` throughout.
- **Reactivity** — `ref`, `computed` (cart totals, budget meter, builder running total) and
  `watch` (debounced game and store search).
- **Vue Router** — 14 routes, history mode, and three kinds of guard: `requiresAuth`
  (bounces to `/login` and returns you afterwards), `guestOnly`, and `requiresSetup`.
- **Pinia** — three stores: `auth` (session), `cart` (persisted to localStorage), `setup`
  (quiz + generated setup, also persisted so a refresh does not lose it).
- **Scoped styles** — every component styles itself; shared tokens come from CSS variables.
- **Conditional rendering and lists** — `v-if`/`v-for` drive loading, error and empty states
  on every page that touches the network.

---

## Open questions

- **The UI has been verified through the API, not through a browser.** Every route was
  exercised directly over HTTP against live Neon and live IGDB, and all of it passed — but
  nobody has yet clicked through the actual pages. Rendering, loading and empty states are
  the untested layer. **Do this first:** `npm run dev`, then register, run the quiz, add the
  setup to the cart and place an order.
- **IGDB's tag vocabulary is not RAWG's, and the engine is tuned to keyword lists.**
  `GAME_SIGNALS` in `engine.js` matches words like "open world" and "competitive". Cyberpunk
  2077, Valorant and Minecraft all classify correctly (high graphics / competitive / casual
  respectively), but a game whose IGDB themes and keywords miss every keyword falls back to
  `balanced`. If a game classifies oddly, that list is the place to look.
- **Only the free IGDB tier has been used**, at well under its 4 requests/second limit. The
  400ms search debounce is what keeps it there — do not remove it.
- **No password reset, no email verification, no profile editing.** The Account page is
  read-only and says so.
- **"Popular parts" on the homepage is not a popularity metric** — it is the highest-tier
  parts. There is no order-count query behind it.
