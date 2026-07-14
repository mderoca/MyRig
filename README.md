# MyRig

**Design the rig that fits you.**

MyRig is two things sharing one catalog:

1. a **store** — browse parts and accessories, wishlist, cart, place orders, with real accounts; and
2. a **planner** — a quiz that recommends a whole gaming setup from the games you play, your budget and your style, with scores and an upgrade path.

The planner recommends things the store actually sells. That is the point of the design:
one `products` table, read by both.

Built as a school course project. It demonstrates Vue 3 as the main framework, plus an
external API (RAWG), a database (Neon Postgres), authentication, and deployment (Vercel).

**Current state:** feature-complete and building. The recommendation engine and the auth
layer are covered by scripted checks (`npm run check`). **The database-backed flows have
not been run against a live Neon database yet** — see [Open questions](#open-questions).

---

## How MyRig is different from PCPartPicker

PCPartPicker focuses on PC parts, prices and compatibility. MyRig does no compatibility
checking and uses realistic *sample* prices, so it does not try to compete there.

> **PCPartPicker helps users build a PC.
> MyRig helps users design a full gaming setup based on what games they play, their
> budget, and their setup style.**

| | What it means |
|---|---|
| **Game-first recommendations** | The build starts from your actual games. Their RAWG genres and tags decide whether you need frames or fidelity. |
| **Full setup budget** | Your budget covers the whole desk — monitor, keyboard, mouse, headset, lighting, decor — not just the tower. |
| **Setup style picker** | RGB / minimalist / white / cozy / streamer / esports changes the case, the peripherals and the lighting. |
| **Beginner learning area** | Plain-language explanations of every part, and inline notes next to each recommendation. |
| **Setup scores** | Five scores out of 100, each with its reasoning written out. |
| **Upgrade path** | What to buy next, in what order, roughly what it costs, and why. |
| **Can I Run It?** | Search a real game; MyRig works out what it needs and what that rig costs. |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build tool | Vite 6 |
| Routing | Vue Router 4, with auth guards |
| State | Pinia (`auth`, `cart`, `setup`) |
| Styling | Plain CSS with custom properties (no Tailwind) |
| External API | [RAWG Video Games API](https://rawg.io/apidocs) |
| Database | [Neon](https://neon.tech) Postgres, via `@neondatabase/serverless` |
| Backend | Vercel serverless functions (`/api`) |
| Auth | Email + password — `bcryptjs` hashing, `jose` JWT in an httpOnly cookie |
| Hosting | Vercel |

**Why plain CSS and not Tailwind:** every colour lives in `src/styles/theme.css`. Re-skinning
the app means editing one file, not hunting utility classes through 30 components.

---

## Run it locally

```bash
cd D:\HemlockOakProjects\MyRig
npm install
cp .env.example .env      # then fill in the three values below
npm run db:setup          # creates the tables in Neon and seeds the catalog
npm run dev               # http://localhost:5173
```

`npm run dev` serves the frontend **and** the `/api` routes. You do **not** need the Vercel
CLI — `vite.config.js` contains a middleware (`vercelApiDevServer`) that runs the files in
`/api` locally with the same `req.query` / `req.body` / `res.status().json()` contract
Vercel gives them in production.

There is no seeded user. **Register an account in the app** to create the first one.

### Environment variables

All three are **server-side only**. None is ever sent to the browser.

| Name | Where to get it |
|---|---|
| `RAWG_API_KEY` | Free key from <https://rawg.io/apidocs> |
| `DATABASE_URL` | Neon dashboard → your project → *Connection string* (use the **pooled** one) |
| `AUTH_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

`AUTH_SECRET` signs the session cookies. It must be **at least 32 characters**; the app
refuses to start a session otherwise. Changing it signs everyone out. Use a *different*
value in production than in dev.

Put them in `.env` locally, and in **Vercel → Settings → Environment Variables** for
production. `.env` is gitignored; never commit it.

### What "working" looks like

- `npm run build` → `✓ built in ~600ms`, writes `dist/`.
- `npm run check` → the engine check (5 quizzes) and the auth check (27 assertions), all passing.
- Without the env vars set, every route fails **loudly and clearly** rather than crashing:
  ```
  GET  /api/products     → 503 {"error":"The database is not configured. ..."}
  POST /api/auth/login   → 503 {"error":"The database is not configured. ..."}
  GET  /api/auth/me      → 200 {"user":null}      # signed out is not an error
  ```

---

## Set up Neon

1. Create a free project at <https://neon.tech>. (Verified 2026-07-14 — re-check the free
   tier before relying on it.)
2. Copy the **pooled** connection string into `DATABASE_URL` in `.env`.
3. Run `npm run db:setup`. Expected output:

```
Applying schema...
Seeding products...
Seeding learning cards...
Seeding upgrade rules...

Done. Seeded 40 products, 9 learning cards, 25 upgrade rules.
Register an account in the app to create your first user.
```

**`db/catalog.js` is the single source of truth for catalog data.** To change what MyRig
sells or recommends, edit that file and re-run `npm run db:setup`. `db/seed.sql` is a
*generated* file (`npm run db:gen-seed`) — it exists so you can paste the catalog straight
into the Neon SQL Editor. Do not hand-edit it.

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it at <https://vercel.com/new>. Vercel detects Vite from `vercel.json`.
3. Add `RAWG_API_KEY`, `DATABASE_URL` and `AUTH_SECRET` under **Settings → Environment
   Variables**.
4. Deploy. Files in `/api` become serverless functions; everything else is a static SPA.

`vercel.json` rewrites every non-`/api` path to `index.html` so Vue Router's history mode
survives a hard refresh of `/shop`, `/orders`, etc.

The session cookie gets the `Secure` flag automatically in production (it is omitted in dev
so it works over plain `http://localhost`). See `startSession()` in `api/_lib/auth.js`.

---

## Project structure

```
src/
  components/   Navbar, Footer, Logo, AuthLayout, ProductCard, GameSearch,
                SelectedGames, RecommendationCard, BudgetBreakdown, StyleSummary,
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
                engine.js      the recommendation engine (pure functions)
                rawg.js        server-side RAWG client — holds the API key
                catalog.js     loads products out of Neon
  auth/         register.js  login.js  logout.js  me.js
  games/        search.js  [id].js
  products.js   learning.js  recommend.js  can-i-run.js  builds.js  wishlist.js  orders.js

db/
  catalog.js    SOURCE OF TRUTH for products, learning cards, upgrade rules
  schema.sql    the nine tables
  seed.sql      GENERATED from catalog.js — do not hand-edit
  connection.js the Neon client
  setup.js      npm run db:setup

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
| `GET /api/games/search?q=` | — | Search RAWG. |
| `GET /api/games/:id` | — | One game in detail. |
| `POST /api/recommend` | — | Quiz answers → full setup, budget, scores, upgrade path. |
| `POST /api/can-i-run` | — | `{gameId}` → what that game needs and what it costs. |
| `GET/POST/DELETE /api/wishlist` | **yes** | The signed-in user's wishlist. |
| `GET/POST /api/orders` | **yes** | Order history; place an order. |
| `GET/POST/DELETE /api/builds` | **yes** | Saved setups from the quiz. |

**The frontend never calls RAWG or Neon directly.** It has no key for either. That is the
whole reason the API routes exist — a key in the browser bundle is a key you have given away.

---

## Database tables

| Table | Holds |
|---|---|
| `products` | **One catalog, two consumers.** Everything the store sells and everything the engine recommends. `kind` is `part` or `accessory`; only parts carry a `tier` (`budget`/`mid`/`high`/`ultra`). `best_for[]` and `styles[]` are what the engine matches on. |
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

## How the recommendation logic works

All of it is in `api/_lib/engine.js`. It is deliberately **rule-based, not AI** — pure
functions of the inputs, so the same quiz always produces the same setup. That makes it
demoable, debuggable and explainable.

1. **Read the games.** `readGameSignal()` scans the RAWG genres/tags of the selected games
   and scores them as *competitive*, *graphics* or *casual*.
2. **Pick target tiers.** The budget sets a baseline; the goal bumps the categories that
   goal depends on (competitive → faster monitor, streaming → stronger CPU, high graphics →
   stronger GPU); the games nudge it further.
3. **Reserve money for the setup before the tower spends it all.** This is the core
   argument of the app. A streaming setup needs a microphone more than a faster GPU, and a
   cozy setup with no lamp is not cozy. That money comes off the table *first* — otherwise
   the tower always wins and you have built a PC, not planned a setup.
4. **Pick each core part.** Candidates are scored on goal fit + style fit + tier fit +
   affordability; the best wins.
5. **Spend the leftovers.** `upgradePass()` moves parts up a tier in the order the goal
   cares about. A build landing at 70% of budget is not a good build, it is an unfinished
   one. An upgrade is only allowed if it does not make goal or style fit worse — that is
   what stops a casual build being "upgraded" into a GPU it will never use.
6. **Buy the extras**, essentials first, then style flourishes, until the money runs out.
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

- **`npm run db:setup` DROPs every table, including `users`, `orders` and `saved_builds`.**
  It wipes all accounts and all order history. Fine for a demo; do not run it against
  anything you want to keep.
- **Rate limiting must live in the database, not in memory.** Serverless functions do not
  share memory — an in-process counter resets on every cold start and throttles nothing.
  That is why the `rate_limits` table exists.
- **Postgres `NUMERIC` comes back from Neon as a *string*.** `withNumericPrice()` in
  `api/_lib/catalog.js` maps prices back to numbers. If you add a numeric column, do the
  same, or your prices will concatenate instead of add.
- **The cart is browser-only and its prices are display-only.** The server re-reads every
  price at checkout. Nothing a user edits in `localStorage` can change what they are
  charged.
- **RAWG free keys are rate-limited.** The game searches debounce by 400ms so you get one
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

- **Nothing database-backed has been run against a live Neon database.** The routes,
  validation, guards and error handling are verified, and the auth *logic* is unit-checked —
  but register → login → browse → cart → order → wishlist → save build has not been
  executed end to end, because no `DATABASE_URL` has been supplied. **Do this first:** set
  the three env vars, run `npm run db:setup`, then register an account and place an order.
- **RAWG has not been called with a live key**, so game search and "Can I Run It?" are
  unverified against the real API.
- **No password reset, no email verification, no profile editing.** The Account page is
  read-only and says so.
- **"Popular parts" on the homepage is not a popularity metric** — it is the highest-tier
  parts. There is no order-count query behind it.
