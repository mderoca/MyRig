# MyRig — presentation notes

Everything you need to present this project. Read the [README](./README.md) for setup and
architecture; this file is for the talk itself.

---

## The one-paragraph summary

> MyRig is a gaming setup planner built with Vue.js. Unlike PCPartPicker, which focuses
> mainly on PC parts, prices and compatibility, MyRig focuses on the full gaming setup
> experience. Users select their games, budget, setup style and goals. The app uses the
> RAWG API to search real games, Neon Postgres to store setup data and saved builds, and
> Vercel to host the app and API routes. The final result includes game-first
> recommendations, a full setup budget, style matching, beginner learning cards, setup
> scores, and future upgrade paths.

## The one-sentence difference

> **PCPartPicker helps you build a PC. MyRig helps you design a full gaming setup around
> what you play, what you can spend, and how you want it to look.**

---

## Demo script (about 4 minutes)

Before you start: run `npm run dev`, have `http://localhost:5173` open, and make sure
**`RAWG_API_KEY` and `DATABASE_URL` are set** — without them the game search and saved
builds will show error states.

1. **Home (20s).** Read the tagline. Point at the six differentiator cards — that section
   exists to answer the "isn't this just PCPartPicker?" question before anyone asks it.

2. **Quiz (60s).** Pick **Balanced ($900–$1500)**, **Streaming / content**, **Streamer
   setup**. Tick **"I am new to PC building"**.
   Then search **Valorant** in the game box — say out loud: *"this is a live call to the
   RAWG API, going through our own serverless route so the API key never reaches the
   browser."* Select it. Search **Cyberpunk 2077** and select that too.

3. **Generate Setup (90s).** This is the payoff. Walk down the page:
   - **The items.** Note the CPU is a strong one — *because* the goal is streaming. Note
     the microphone, webcam and ring light are in the build.
   - **Beginner notes.** Every card has a plain-language explanation, because beginner
     mode is on.
   - **Budget breakdown.** Point at the meter. *"The budget covers the whole desk, not
     just the tower — that's the difference from PCPartPicker in one picture."*
   - **Setup scores.** Five scores, each with its reasoning written out.
   - **Upgrade path.** *"A setup isn't one purchase."*

4. **Change one answer (45s).** Go back, switch the goal to **Competitive FPS**, regenerate.
   The monitor changes to a **240Hz** panel and the mouse to a lightweight one. Same
   budget, same games — different build. **This is the single most convincing moment in
   the demo. Do not skip it.**

5. **Save + Saved Builds (30s).** Save the build, go to Saved Builds. *"That's a row in
   Neon Postgres. No login — the app generates a demo user id and keeps it in
   localStorage."*

6. **Learning Center (15s).** *"Those cards are rows in the database too — the same rows
   that produce the beginner notes on the recommendation page."*

---

## Requirements checklist

| Requirement | Where it is |
|---|---|
| Vue.js as the main framework | 15 components + 5 pages, Composition API, Vue Router, Pinia |
| External API | RAWG, via `api/games/search.js` and `api/games/[id].js` |
| Database | Neon Postgres, 5 tables, `db/schema.sql` |
| Deployment | Vercel — static SPA + `/api` serverless functions |
| Serverless API routes | 5 routes, listed in the README |
| No authentication | `localStorage` demo user id, `src/services/user.js` |

---

## Questions you will probably get

**"Why not just use PCPartPicker?"**
Because it answers a different question. PCPartPicker asks *"do these parts fit
together?"*. MyRig asks *"what should my whole setup be, given what I play and what I can
spend?"* — which includes the monitor, the desk, the lighting, and what to buy next.

**"Is the recommendation AI?"**
No, and deliberately not. It is a rule-based engine (`api/_lib/engine.js`) — pure
functions, so the same quiz always gives the same setup. That makes it demoable,
debuggable and explainable. An LLM here would add cost and unpredictability for no gain.

**"How does it decide what to recommend?"**
Six steps: read the games' RAWG genres/tags to detect competitive vs graphics vs casual →
set a target tier per category from the budget, bumped by the goal → **reserve money for
the non-tower parts of the setup before the tower spends it all** → score every candidate
part on goal fit, style fit, tier fit and affordability → spend leftovers upgrading the
parts the goal cares about → buy the accessories.

**"Why is the API key not in the frontend?"**
Anything in the frontend bundle is public. `RAWG_API_KEY` is read inside a serverless
function (`api/_lib/rawg.js`), which the browser cannot see. The browser only ever calls
our own `/api/games/search`.

**"How is the data stored without a login?"**
The app generates a random id like `myrig_user_a1b2c3d4` on first visit and keeps it in
`localStorage`. Saved builds are keyed by it. It identifies a *browser*, not a person —
which is fine, because the app stores no personal data.

**"What would you do with more time?"**
Real price data via a retailer API; a compatibility layer; and letting users tweak a
recommended item and watch the scores and budget update live.

---

## Things to be honest about if asked

- Prices are realistic **samples**, not live retail prices. The app is a planner.
- There is **no compatibility checking** — that is PCPartPicker's job, not this one.
- The catalog is small (22 parts, 18 accessories). It is enough to show the logic
  differentiating builds, which is the point.
- The delete endpoint matches on user id as well as build id, but with no login this is
  **demo-grade separation, not real authorisation**. Acceptable only because no personal
  data is stored.
