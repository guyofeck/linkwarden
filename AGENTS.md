# Linkwarden — agent notes

## Running (Base44 dev)
- `docker compose -f docker-compose.base44.yml up -d --build`. Services: `postgres`, `meilisearch`, one-shot `setup`, `web` (Next dev, port 3000), `worker` (`tsx watch`).
- `setup` runs, in order: `yarn workspaces focus linkwarden @linkwarden/web @linkwarden/worker` (skips the heavy mobile/extension workspaces), `yarn prisma:generate`, Playwright browser download into the `playwright-browsers` volume, `prisma migrate deploy`. Re-run it (`docker compose -f docker-compose.base44.yml up -d setup`) after dependency or schema changes, then restart `web`/`worker`.
- `.base44/Dockerfile.dev` only holds system deps (Chromium libs pinned to Playwright 1.57.0 — bump if the lockfile's playwright version changes). Source is bind-mounted; `node_modules` lives in the checkout (gitignored).
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` makes the web `postinstall` (`playwright install --with-deps`) a no-op so it doesn't apt-get on every install.
- The `monolith` binary (single-file HTML archives) is not installed in dev; that archive format is reported as unavailable. Screenshots/PDF/readability still work.
- `NEXTAUTH_URL` must be the public preview URL + `/api/v1/auth`; it's set from `BASE44_PUBLIC_HOST_SUFFIX` in compose. `next.config.js` adds `allowedDevOrigins` for the preview origin only when that var is set.
- Uploaded/archived files go to `./data` (`STORAGE_FOLDER`, gitignored).

## Verify
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login` → 200. Register a user at `/register` (credentials auth is on by default).
- Tests: `docker compose -f docker-compose.base44.yml exec web yarn test` (vitest from repo root).
