# Celestial Vault

A website for the Celestial guild's shared vault (ChillSMP, Bliss realm). Anyone with the link can browse every item, who owns it, and the member list. A few trusted editors can log in to change things.
It runs on the free Cloudflare plan: one Worker (a small API plus the website) and one D1 database. No images, no paid features.

## Pages
| Page | Who | What it shows |
| :--- | :--- | :--- |
| **Vault** `/` | everyone | All items with search, filters, sorting and an item detail panel. Filters are saved in the link, so you can share a view. |
| **Dashboard** `/dashboard` | everyone | Totals, items per category, each player's share of the vault, highlights and recent changes. |
| **Members** `/members` | everyone | Players with IGN (copy button), rank, platform and vault-ban status. |
| **Rules** `/rules` | everyone | The vault rules. The text lives in `src/content/rules.ts`. |
| **Manage** `/manage` | editors | Items, Trash, Categories, Members, Audit log and Backup. |

## How editing works
- Click **Editor login** in the header. One shared email and password is stored as Cloudflare secrets (see below).
- Editors can add, edit, duplicate and archive items, change owners, manage categories and members, and toggle a member's vault ban.
- Nothing is permanently deleted: archived items sit in **Trash** and can be restored. Categories can't be removed.
- Every change is written to the **Audit log** (what changed, before and after). The Dashboard shows the last 10 changes publicly.
- If two people edit the same record, the second save is refused and asks them to reload.
- `Unknown` and `Guild (shared)` are locked: they can't be edited, banned or archived.

## Backup and restore
- **Backup:** Manage → Backup → *Download backup*. It saves one JSON file with everything, including archived rows and the audit log. Do this regularly.
- **Restore:** give the JSON file to Claude and ask for a restore script for the D1 console.

## How deploying works
GitHub → Cloudflare. Every commit to the repo makes Cloudflare run `npm run build` and then `npx wrangler deploy`. Build logs are under the Worker's **Deployments / Builds** tab.
To change something: get new files, upload them to GitHub, commit.

## Setup (one time)
1. Create the D1 database `celestial-vault-db` and run `migrations/001_schema.sql`, then `migrations/002_seed.sql`, in the D1 console. Run each only once.
2. Put the real D1 Database ID and the public Turnstile Site Key in `wrangler.jsonc`.
3. Add the secrets below in Cloudflare.

## Secrets (names only, never put values in the repo)
Set in Cloudflare → Workers & Pages → celestial-vault → Settings → Variables and Secrets, type **Secret**:
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` (96 hex characters), `TURNSTILE_SECRET_KEY`.
The public `TURNSTILE_SITE_KEY` goes in `wrangler.jsonc` under `vars`.

## Security
- **Login lockout** (settings in `worker/throttle.ts`): 5 wrong tries from one address in 15 minutes locks that address for 15 minutes. 30 wrong tries from anywhere in an hour locks all logins for 30 minutes. Addresses are stored only as a keyed hash.
- **Sessions** last 12 hours and live in an HttpOnly cookie.
- **Signing everyone out:** use **Sign out everywhere** in the Editor menu. Changing `ADMIN_EMAIL`, `ADMIN_PASSWORD` or `JWT_SECRET` in Cloudflare also signs everyone out.
- If a secret is missing, login switches off (503) instead of falling back to anything weaker.
- Security headers are defined in `worker/security.ts`. `public/_headers` must stay identical to it.

## Common problems
**The build failed.** Open the failed build's log in Cloudflare and copy the exact error text to Claude. Two usual causes: the `database_id` in `wrangler.jsonc` is still `REPLACE_WITH_D1_DATABASE_ID`, or some files didn't upload (upload the *contents* of the unzipped folder, not the zip, and not `node_modules`).

**I'm locked out of login.** After 5 wrong tries your address is locked for 15 minutes, and a global lock lasts up to 30 minutes. Wait it out (the login box shows a countdown). Waiting is the only way in, which is the point. If you forgot the password, set a new `ADMIN_PASSWORD` secret in Cloudflare.

**Login says it isn't available.** One of the four secrets is missing, or the Turnstile Site Key in `wrangler.jsonc` is wrong. Check the secret names exactly.

**The data looks old.** Public data can lag by up to 30 seconds after an edit. Refresh the page. If it is still old, check that the edit actually saved (Manage → Audit log).

**The Turnstile check doesn't appear.** The hostname in the Turnstile widget must match your `workers.dev` address exactly.

## Design system
- **Themes:** light by default (soft neumorphism), plus a dark theme (lighter surfaces, no neumorphic shadows). The toggle in the header saves the choice in the browser (`cv-theme`). The system colour scheme is ignored on purpose.
- **Where things live:** `src/styles/tokens.css` (colours, type scale, spacing, radii, shadows, motion), `src/styles/base.css`, `src/styles/components.css` (buttons, inputs, tags, popovers, dialogs, drawer, toasts, tabs). Components use tokens, never raw colours.
- **Colour roles:** cyan is for actions and selection, gold only for MEGA and rank highlights, red only for destructive actions and bans.
- **Fonts:** Plus Jakarta Sans (text, with tabular numbers) and Newsreader (wordmark and page titles), self-hosted latin subsets bundled by the build.
- **Logo:** `public/favicon.svg` is the logo file unchanged; the PNG icons are rendered from it.
