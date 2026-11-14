# TaskFlow web

A Next.js App Router + TypeScript frontend for the fictional TaskFlow FastAPI demo-app. All API requests run directly from the browser; no credentials or backend proxy are needed.

Live demo: <deployment URL goes here>

## Run locally

Use Node.js major 26 (see `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To use a different API, create `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://taskflow-demo-app.onrender.com
```

That URL is also the default. Next.js embeds public environment variables at build time, so set it before building. A custom API must permit browser requests from your frontend origin via CORS.

## API and behavior

The frontend consumes only `GET /health`, `GET /v1/tasks` (status, cursor, limit), `POST /v1/tasks`, `GET /v1/tasks/{id}`, and `GET/POST /v1/tasks/{id}/comments`. Statuses and deletion cannot be changed through this API.

The board has All / To do / Doing / Done filters, explicit Load more pagination, and task creation. A newly created task appears immediately in All. Detail pages load every comment page to find each revision chain's current head. Superseded revisions sit in collapsed, struck-through history beneath their successor. Select a current head to revise it; conflicts use the stable `conflict` code and offer Reload thread while preserving your draft.

Health distinguishes operational, degraded, and unreachable states. After three seconds, a pending health check displays a free-tier wake-up message; requests time out after 60 seconds and can be retried.

Fictional data only. The demo is public, comments retain revision history, and the service's ephemeral data can reset on restart. Do not enter personal or sensitive information.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Vitest + Testing Library cover mocked API error envelopes, stable error codes, cursors, health, revision payloads, and collapsed comment revision chains. CI runs lint, strict TypeScript, tests, and a production build on pushes and pull requests.

Source layout: `app/` routes and the single global stylesheet, `components/` comment chains, `lib/api.ts` typed client, `tests/` unit/component tests, and `.github/workflows/ci.yml`.
