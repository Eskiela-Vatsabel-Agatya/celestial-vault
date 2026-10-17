-- Celestial Vault: schema (run ONCE in the D1 console, before 002_seed.sql)
-- Timestamps are ISO-8601 UTC with a trailing Z, e.g. 2026-10-17T02:12:39Z (safe to parse in JavaScript).
-- D1 enforces foreign keys by default, so no PRAGMA is needed.

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  color_hex   TEXT NOT NULL DEFAULT '#64748b',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE members (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  minecraft_ign   TEXT,
  alt_ign         TEXT,
  guild_rank      TEXT NOT NULL DEFAULT 'Member',
  platform        TEXT CHECK (platform IN ('Java','Bedrock','Both')),
  kind            TEXT NOT NULL DEFAULT 'player' CHECK (kind IN ('player','label')),
  is_vault_banned INTEGER NOT NULL DEFAULT 0 CHECK (is_vault_banned IN (0,1)),
  notes           TEXT,
  archived_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE items (
  id            INTEGER PRIMARY KEY,
  category_id   TEXT NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  item_set_tier TEXT,
  is_mega       INTEGER NOT NULL DEFAULT 0 CHECK (is_mega IN (0,1)),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  is_infinite   INTEGER NOT NULL DEFAULT 0 CHECK (is_infinite IN (0,1)),
  custom_level  INTEGER,
  notes         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  archived_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE item_owners (
  item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  member_id TEXT    NOT NULL REFERENCES members(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY (item_id, member_id)
);

-- Who changed what. Only editors can write here; every add/edit/delete/restore is logged.
CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  actor       TEXT NOT NULL DEFAULT 'editor',
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  summary     TEXT NOT NULL,
  before_json TEXT,
  after_json  TEXT
);

-- Login brute-force protection. key = 'ip:<hmac of ip>' or 'global'.
CREATE TABLE login_throttle (
  key               TEXT PRIMARY KEY,
  fail_count        INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  locked_until      TEXT
);

-- Small key/value settings. 'session_epoch' lets an editor sign out every device at once.
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_items_category ON items(category_id, sort_order);
CREATE INDEX idx_items_archived ON items(archived_at);
CREATE INDEX idx_owners_member  ON item_owners(member_id);
CREATE INDEX idx_audit_at       ON audit_log(at DESC);
