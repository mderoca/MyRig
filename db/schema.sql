-- MyRig database schema (Neon Postgres)
--
-- Apply with:  npm run db:setup
-- (or paste this file into the Neon SQL Editor)
--
-- Five tables:
--   parts, accessories  -> the catalog the recommendation engine picks from
--   learning_cards      -> beginner explanations for the Learning Center
--   upgrade_rules       -> rules that produce the Upgrade Path
--   saved_builds        -> builds a demo user saved (keyed by a localStorage id)

DROP TABLE IF EXISTS saved_builds;
DROP TABLE IF EXISTS upgrade_rules;
DROP TABLE IF EXISTS learning_cards;
DROP TABLE IF EXISTS accessories;
DROP TABLE IF EXISTS parts;

-- Core PC components: cpu, gpu, ram, storage, case, monitor.
CREATE TABLE parts (
  id        SERIAL PRIMARY KEY,
  name      TEXT           NOT NULL,
  category  TEXT           NOT NULL,
  price     NUMERIC(10, 2) NOT NULL,
  tier      TEXT           NOT NULL,  -- budget | mid | high | ultra
  best_for  TEXT[]         NOT NULL DEFAULT '{}',  -- gaming goals this part suits
  styles    TEXT[]         NOT NULL DEFAULT '{}',  -- setup styles this part suits
  reason    TEXT           NOT NULL   -- shown on the recommendation card
);

-- Everything outside the tower: keyboard, mouse, headset, microphone,
-- webcam, lighting, desk. This is what makes MyRig a *setup* planner.
CREATE TABLE accessories (
  id        SERIAL PRIMARY KEY,
  name      TEXT           NOT NULL,
  category  TEXT           NOT NULL,
  price     NUMERIC(10, 2) NOT NULL,
  best_for  TEXT[]         NOT NULL DEFAULT '{}',
  styles    TEXT[]         NOT NULL DEFAULT '{}',
  reason    TEXT           NOT NULL
);

-- Plain-language explanations shown in the Learning Center, and inline next to
-- recommended parts when the user ticks "I am new to PC building".
CREATE TABLE learning_cards (
  id                   SERIAL PRIMARY KEY,
  title                TEXT NOT NULL,
  short_description    TEXT NOT NULL,
  beginner_description TEXT NOT NULL,
  category             TEXT NOT NULL  -- matches a part category, so notes can be paired to parts
);

-- Rules that generate the Upgrade Path. A rule fires when the build's
-- condition_type field equals condition_value.
CREATE TABLE upgrade_rules (
  id              SERIAL PRIMARY KEY,
  condition_type  TEXT           NOT NULL,  -- budget_tier | gaming_goal | setup_style
  condition_value TEXT           NOT NULL,
  upgrade_name    TEXT           NOT NULL,
  priority        TEXT           NOT NULL,  -- Low | Medium | High
  estimated_cost  NUMERIC(10, 2) NOT NULL,
  reason          TEXT           NOT NULL
);

-- Saved builds. There is no login: user_id is a demo id generated in the
-- browser and kept in localStorage (e.g. myrig_user_a1b2c3d4).
CREATE TABLE saved_builds (
  id                SERIAL PRIMARY KEY,
  user_id           TEXT           NOT NULL,
  build_name        TEXT           NOT NULL,
  selected_games    JSONB          NOT NULL DEFAULT '[]',
  budget_tier       TEXT           NOT NULL,
  gaming_goal       TEXT           NOT NULL,
  setup_style       TEXT           NOT NULL,
  beginner_mode     BOOLEAN        NOT NULL DEFAULT FALSE,
  recommended_items JSONB          NOT NULL DEFAULT '[]',
  total_cost        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  scores            JSONB          NOT NULL DEFAULT '{}',
  upgrade_path      JSONB          NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Saved builds are always looked up by user, newest first.
CREATE INDEX saved_builds_user_idx ON saved_builds (user_id, created_at DESC);
