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
