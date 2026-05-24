# Draftly

Monorepo for the Draftly email assistant — Next.js frontend, Node.js I/O service, and Python AI service.

## Stack

| Service | Path | Port |
|---------|------|------|
| Frontend | `apps/frontend` | 3000 |
| Node service | `apps/node-service` | 4000 |
| AI service | `apps/ai-service` | 8000 |
| PostgreSQL | docker | 5432 |
| Redis | docker | 6379 |
| RabbitMQ | docker | 5672 / 15672 (UI) |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in secrets
cp .env.example .env

# 3. Start infra + services via Docker
npm run docker:up

# 4. Or run locally with Turborepo (requires Postgres, Redis, RabbitMQ running)
npm run dev
```

## Workspaces

- `@draftly/frontend` — Next.js 15 app
- `@draftly/node-service` — Express API, Gmail I/O, RabbitMQ producers/consumers
- `@draftly/shared` — Shared TypeScript types
- `@draftly/ai-service` — FastAPI (Python, not an npm workspace)

## RabbitMQ workers

Queue consumers run as separate Docker services:

- `node-service-send-worker` — retries failed Gmail sends
- `node-service-profile-worker` — 30-day style profile re-evaluation cron

Locally:

```bash
npm run worker:send --workspace=@draftly/node-service
npm run worker:profile --workspace=@draftly/node-service
```
