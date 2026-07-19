-- MyRig database schema (Neon Postgres)
--
-- Apply with:  npm run db:setup
-- (or paste this file into the Neon SQL Editor)
--
-- MyRig is two things sharing one catalog:
--   1. a STORE - browse products, cart, wishlist, place orders
--   2. a PLANNER - a quiz that recommends a whole setup, with scores and an
--      upgrade path
--
-- Both read the SAME `products` table. That is deliberate: the recommendation
-- engine recommends things you can actually add to the cart. A part is a
-- product; there is no second catalog to keep in sync.

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS saved_builds;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS upgrade_rules;
DROP TABLE IF EXISTS learning_cards;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS parts;        -- superseded by `products`
DROP TABLE IF EXISTS accessories;  -- superseded by `products`

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

-- Everything MyRig sells and everything it can recommend.
--   kind = 'part'      -> goes inside the tower (cpu, gpu, ram, storage, case) or is the monitor
--   kind = 'accessory' -> everything else (keyboard, mouse, headset, mic, webcam, lighting, desk)
-- Only parts carry a `tier`; the engine uses it to decide how far up the range
-- a budget can reach.
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT           NOT NULL,
  category    TEXT           NOT NULL,  -- cpu | gpu | ram | storage | case | monitor | keyboard | ...
  kind        TEXT           NOT NULL CHECK (kind IN ('part', 'accessory')),
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  tier        TEXT,                     -- budget | mid | high | ultra   (NULL for accessories)
  best_for    TEXT[]         NOT NULL DEFAULT '{}',  -- gaming goals this suits
  styles      TEXT[]         NOT NULL DEFAULT '{}',  -- setup styles this suits
  reason      TEXT           NOT NULL,  -- why the engine picked it / the store blurb
  in_stock    BOOLEAN        NOT NULL DEFAULT TRUE,

  -- Compatibility. NULL wherever the field does not apply, which is most rows.
  -- The engine treats NULL as "no constraint", so an accessory never blocks a
  -- build. See COMPATIBILITY_RULES in api/_lib/engine.js.
  socket      TEXT,                     -- cpu + motherboard: AM4 | AM5 | LGA1700
  ram_type    TEXT,                     -- motherboard + ram: DDR4 | DDR5
  tdp         INT CHECK (tdp IS NULL OR tdp >= 0),          -- cpu + gpu: watts drawn
  wattage     INT CHECK (wattage IS NULL OR wattage > 0)    -- psu: watts supplied
);

CREATE INDEX products_category_idx ON products (category);
CREATE INDEX products_kind_idx ON products (kind);

-- Plain-language explanations. Shown in the Learning Center, and inline next to
-- recommended parts when the user ticks "I am new to PC building".
CREATE TABLE learning_cards (
  id                   SERIAL PRIMARY KEY,
  title                TEXT NOT NULL,
  short_description    TEXT NOT NULL,
  beginner_description TEXT NOT NULL,
  category             TEXT NOT NULL  -- matches a product category, so notes pair to parts
);

-- Rules that generate the Upgrade Path. A rule fires when the build's
-- condition_type field equals condition_value.
CREATE TABLE upgrade_rules (
  id              SERIAL PRIMARY KEY,
  condition_type  TEXT           NOT NULL,  -- budget_tier | gaming_goal | setup_style
  condition_value TEXT           NOT NULL,
  upgrade_name    TEXT           NOT NULL,
  priority        TEXT           NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
  estimated_cost  NUMERIC(10, 2) NOT NULL,
  reason          TEXT           NOT NULL
);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

-- SECURITY: password_hash holds a bcrypt hash and NOTHING ELSE. Plaintext
-- passwords are never stored, never logged, and never returned by any route.
-- See api/_lib/auth.js.
--
-- Emails are stored lower-cased and are unique - the app compares them
-- case-insensitively, because nobody remembers whether they signed up as
-- Marc@ or marc@.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  display_name  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Throttles login and registration attempts. This lives in the database rather
-- than in memory because serverless functions do not share memory - an
-- in-process counter would reset on every cold start and throttle nothing.
CREATE TABLE rate_limits (
  bucket       TEXT        PRIMARY KEY,  -- e.g. 'login:marc@example.com'
  attempts     INT         NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Shopping
-- ---------------------------------------------------------------------------

-- ON DELETE CASCADE throughout: deleting a user removes their wishlist, orders
-- and saved builds with them. No orphan rows pointing at a user that is gone.
CREATE TABLE wishlist (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id INT         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)  -- adding the same product twice is a no-op, not a duplicate row
);

-- Checkout is SIMULATED. No payment provider, no card details - the app never
-- sees or stores any. Placing an order writes these rows and nothing else.
CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  user_id      INT            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  order_number TEXT           NOT NULL UNIQUE,   -- e.g. MR7899753-0605, shown to the user
  status       TEXT           NOT NULL DEFAULT 'Processing'
                              CHECK (status IN ('Processing', 'Shipped', 'Out for delivery', 'Delivered')),
  total        NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);

-- Line items copy the name and price AT THE TIME OF ORDER. If the catalog price
-- changes tomorrow, this order still shows what was actually paid. That is why
-- these columns are duplicated rather than joined from products.
CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT            NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id INT            REFERENCES products (id) ON DELETE SET NULL,
  name       TEXT           NOT NULL,
  category   TEXT           NOT NULL,
  price      NUMERIC(10, 2) NOT NULL,
  quantity   INT            NOT NULL CHECK (quantity > 0)
);

CREATE INDEX order_items_order_idx ON order_items (order_id);

-- ---------------------------------------------------------------------------
-- The planner
-- ---------------------------------------------------------------------------

-- A setup generated by the quiz and saved by a logged-in user.
-- The JSONB columns hold a snapshot of what the engine produced, so a saved
-- build still renders correctly even after the catalog or the rules change.
CREATE TABLE saved_builds (
  id                SERIAL PRIMARY KEY,
  user_id           INT            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
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

CREATE INDEX saved_builds_user_idx ON saved_builds (user_id, created_at DESC);
