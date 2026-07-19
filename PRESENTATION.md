# MyRig — presentation notes

Read the [README](./README.md) for setup and architecture. This file is for the talk.

---

## The one-paragraph summary

> MyRig is a gaming setup planner and store built with Vue.js. Unlike PCPartPicker, which
> focuses mainly on PC parts and price tracking, MyRig checks compatibility AND plans the full gaming
> setup experience. Users select their games, budget, setup style and goals. The app uses
> the IGDB API to search real games, Neon Postgres to store the catalog, accounts, orders
> and saved builds, and Vercel to host the app and its serverless API routes. The result is
> game-first recommendations, a full setup budget, style matching, beginner learning cards,
> setup scores, upgrade paths — and a store where you can actually buy what it recommends.

## The one-sentence difference

> **PCPartPicker helps you build a PC. MyRig helps you design a full gaming setup around
> what you play, what you can spend, and how you want it to look — and then sells it to you.**

## The architectural idea worth saying out loud

> **The planner and the store share one `products` table.** The engine only ever recommends
> things the store actually sells, so "add this whole setup to my cart" is one click. There
> is no second catalog to keep in sync.

---

## Demo script (about 5 minutes)

Before you start: `npm run dev`, have `http://localhost:5173` open, and make sure
`IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `DATABASE_URL` and `AUTH_SECRET` are set — without them, everything that
touches the database shows an error state. **Register an account beforehand and place one
order**, so the Orders page is not empty on stage.

1. **Home (20s).** The tagline, and the three ways in: quiz, "Can I Run It?", or build it
   yourself. Point at the differentiator cards — that section answers "isn't this just
   PCPartPicker?" before anyone asks.

2. **Can I Run It? (45s).** Search **Cyberpunk 2077**. Say: *"this is a live call to IGDB,
   through our own serverless route, so the API key never reaches the browser."* The page
   comes back with a build-cost estimate and the parts. Say why: *"MyRig read the game's
   genres and tags — open world, story rich, atmospheric — decided it's a fidelity game,
   not a frames game, and built for that."*

3. **Quiz (60s).** Pick **Balanced ($1,050–$1,700)**, **Streaming / content**, **Streamer
   setup**, tick **"I am new to PC building"**. Search **Valorant**, select it.

4. **Generate Setup (90s).** Walk down the page:
   - **The items.** The CPU is a strong one *because* the goal is streaming. The mic, webcam
     and ring light are in the build.
   - **Beginner notes** on every card, because beginner mode is on.
   - **Budget breakdown.** *"The budget covers the whole desk, not just the tower — that's
     the difference from PCPartPicker in one picture."*
   - **Setup scores**, each with its reasoning. **Upgrade path**: *"a setup isn't one
     purchase."*

5. **Change one answer (45s).** Go back, switch the goal to **Competitive FPS**, regenerate.
   The monitor becomes **240Hz** and the mouse becomes a lightweight one. Same budget, same
   games — a different build. **This is the most convincing moment in the demo. Do not skip
   it.**

6. **Add setup to cart → checkout (45s).** One click puts the whole recommended setup in the
   cart. Place the order. *"Checkout is simulated — no payment provider, no card details.
   But note what gets sent: only product ids and quantities. The server looks every price up
   in the database itself, so you can't edit localStorage and buy an RTX for a cent."*

7. **Account (30s).** Orders, Saved Builds, Wishlist. *"Real accounts — bcrypt-hashed
   passwords, session in an httpOnly cookie so a script injection can't steal it."*

---

## Requirements checklist

| Requirement | Where it is |
|---|---|
| Vue.js as the main framework | 18 components, 14 pages, Composition API, Vue Router, Pinia |
| External API | IGDB, via `api/games/*` and `api/can-i-run.js` |
| Database | Neon Postgres, 9 tables, `db/schema.sql` |
| Deployment | Vercel — static SPA + `/api` serverless functions |
| Serverless API routes | 13 routes, listed in the README |
| Authentication | Email + password, bcrypt + JWT httpOnly cookie, `api/_lib/auth.js` |

---

## Questions you will probably get

**"Why not just use PCPartPicker?"**
It answers a different question. PCPartPicker asks *"do these parts fit together?"*. MyRig
asks *"what should my whole setup be, given what I play and what I can spend?"* — including
the monitor, the desk, the lighting, and what to buy next.

**"Is the recommendation AI?"**
No, deliberately. It is a rule-based engine (`api/_lib/engine.js`) — pure functions, so the
same quiz always gives the same setup. That makes it demoable, debuggable and explainable.
An LLM would add cost and unpredictability for no gain.

**"How does it decide what to recommend?"**
Read the game's IGDB genres/tags to detect competitive vs graphics vs casual → set a target
tier per category from the budget, bumped by the goal → **reserve money for the non-tower
parts of the setup before the tower spends it all** → score every candidate on goal fit,
style fit, tier fit and affordability → spend leftovers upgrading what the goal cares about
→ buy the accessories.

**"How are passwords stored?"**
bcrypt hashes, cost 10. The plaintext is never stored and never logged. The session is a
signed JWT in an **httpOnly** cookie — not localStorage, because anything in localStorage is
readable by any XSS on the page.

**"How do you stop CSRF?"**
`SameSite=Lax` on the session cookie, so the browser will not attach it to a cross-site
POST. Plus an `Origin` header check on every state-changing route (`assertSameOrigin`).

**"Could someone change the price at checkout?"**
No. The cart sends ids and quantities only; the server reads every price from the database
and computes the total itself.

**"Why is the API key not in the frontend?"**
Anything in the frontend bundle is public. The IGDB credentials are read inside a serverless
function; the browser only ever calls our own `/api/games/search`.

**"What would you do with more time?"**
Password reset and email verification; real price data from a retailer API; and letting
users tweak a recommended item and watch the scores and budget update live.

---

## Be honest if asked

- Prices are realistic **samples**, not live retail prices.
- **Compatibility covers socket, memory generation and PSU wattage only.** Case clearance, GPU length and cooler height are not checked, and the app says so on screen.
- **Checkout is simulated.** Nothing is charged and nothing ships.
- **No password reset or email verification** — you cannot recover an account.
- The catalog is small (49 products). Enough to show the logic differentiating builds, which
  is the point.
- "Popular parts" on the homepage is just the highest-tier parts — there is no real
  popularity metric behind it.
