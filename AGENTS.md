# Agent Notes

Quick orientation for AI agents working on this repo.

## What this repo is

VNG API lab: OpenAPI specs (`apis/`), shared JSON schemas (`schemas/`), reusable patterns (`patterns/`), and a static React portal (`docs/`) that renders them via Scalar + ReSpec.

## Architecture in one diagram

```
+----------------------------+        +-------------------------------+
|  Netlify (static)          |        |  Fly.io (always-on, ams)      |
|  vng-interactie-apis       |        |  vng-interactie-mocks         |
|  - React portal (docs/)    |        |  - Express gateway :4010      |
|  - Bundled specs           |        |  - 8x Prism procs :5000-5007  |
|  - ReSpec HTML/PDF         |        |  (one per OpenAPI spec)       |
+--------------+-------------+        +---------------+---------------+
               |                                      ^
               |  Scalar "Try it" requests            |
               +------------------------------------- +
                  (hostname-switched in ScalarView.jsx)
```

`docs/src/ScalarView.jsx` picks the mock URL based on `window.location.hostname`:
- localhost → `http://127.0.0.1:${VITE_MOCK_GATEWAY_PORT}` (default: 41837; configured via `.env.development`)
- anything else → `https://vng-interactie-mocks.fly.dev`

## Mock server (Fly.io)

- Code: `scripts/mock-all.js` — Express gateway that proxies `/apis/<spec-path>` to a Prism subprocess per spec.
- Container: `Dockerfile` (node:20-alpine). Must `COPY apis schemas patterns` because specs `$ref` into all three.
- Config: `fly.toml`. `min_machines_running = 1` (always-on). Do not flip back to auto-stop — Prism's cold start (~10s) exceeds Fly proxy's reachability timeout (~8s), causing the first request after idle to fail.
- Readiness: `mock-all.js` waits for every Prism port to bind before `app.listen`. If you add a new spec, it auto-picks up.
- Deploy: pushes to `main` trigger `.github/workflows/fly-deploy.yml`. Manual: `fly deploy`. Logs: `fly logs`.

## Local dev

```bash
pnpm install
pnpm dev   # runs portal (VITE_PORT) + mocks (MOCK_GATEWAY_PORT) + ReSpec generation
```

## When you change things

- **Adding a new OpenAPI spec under `apis/`**: nothing else to do — `mock-all.js` globs `apis/**/*.{yaml,yml}` and assigns Prism ports automatically. Just check `fly logs` after deploy that it started.
- **Spec `$ref`s a new top-level dir**: update `Dockerfile` to `COPY` it, otherwise Prism will `ENOENT` and the readiness gate hangs.
- **Touching `mock-all.js`, `Dockerfile`, or `fly.toml`**: pushing to `main` redeploys Fly automatically.
- **Touching the portal**: Netlify auto-deploys from `main`.

## Gotchas hit before

- Prism's `npx`-based spawn fails silently on alpine; we invoke `./node_modules/.bin/prism` directly.
- `stdio: "ignore"` hid Prism resolver errors; stderr is now `inherit`ed so failures show up in `fly logs`.
- Three legacy specs still hardcode `http://127.0.0.1:4010/...` in their `servers:` block (`apis/rest/{taken,resources,zaakchat}/v0.0.1.yaml`). Scalar overrides this at runtime via `VITE_MOCK_GATEWAY_PORT`, but raw consumers see a dead URL.
