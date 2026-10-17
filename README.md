# Celestial Vault

A public, read-only inventory website for the Celestial guild's shared vault (ChillSMP, Bliss realm).
It runs as one Cloudflare Worker (Hono API plus the built React app) with a D1 database.

## How deploying works
Commit to GitHub and Cloudflare runs `npm run build`, then `npx wrangler deploy`. Every commit redeploys the site.

## Setup
- The database tables and data are in `migrations/` (run once in the D1 console).
- Put the real D1 Database ID in `wrangler.jsonc` (replace `REPLACE_WITH_D1_DATABASE_ID`).

## Security headers
The Content-Security-Policy and the other headers are defined in `worker/security.ts`.
`public/_headers` must be kept identical to it.

## Security
**Secrets** (set in Cloudflare → Workers & Pages → celestial-vault → Settings → Variables and Secrets, type *Secret*; never in the repo):
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` (96 hex characters), `TURNSTILE_SECRET_KEY`.
The public `TURNSTILE_SITE_KEY` goes in `wrangler.jsonc` under `vars`.

**Login lockout** (settings in `worker/throttle.ts`):
- 5 wrong tries from one address within 15 minutes locks that address for 15 minutes.
- 30 wrong tries from anywhere within an hour locks all logins for 30 minutes.
- Addresses are stored only as a keyed hash, never as raw IPs.
- If a secret is missing, login is switched off (503) instead of falling back to anything weaker.

**Signing everyone out:** use **Sign out everywhere** in the Editor menu, or change the `JWT_SECRET` secret.
Sessions also expire by themselves after 12 hours.
