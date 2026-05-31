# Backend hardening notes

## Repo split

When splitting this monorepo into separate repositories, keep these backend paths together:

- `apps/node-service`
- `apps/ai-service`
- `packages/shared`
- `docker-compose.backend.yml`
- root `package.json` and `package-lock.json` or equivalent workspace setup

The frontend should only receive `NEXT_PUBLIC_API_URL` pointing to the Node service. It should not receive `AI_SERVICE_URL`.

## Backend compose

Start backend dependencies and services:

```powershell
docker compose -f docker-compose.backend.yml up -d --build
```

Stop:

```powershell
docker compose -f docker-compose.backend.yml down
```

The backend compose includes:

- MySQL
- RabbitMQ
- Node service
- AI service

It intentionally does not include the frontend.

## Logging

Node logs write to:

```text
/var/log/draftly/node-service/node-service-YYYY-MM-DD.log
```

AI service logs write to:

```text
/var/log/draftly/ai-service/ai-service-YYYY-MM-DD.log
```

Docker volumes:

- `node_logs`
- `ai_logs`

Retention defaults:

- `LOG_RETENTION_DAYS=14`
- Node prune interval: `LOG_PRUNE_INTERVAL_MS=21600000`
- AI prune interval: `LOG_PRUNE_INTERVAL_SECONDS=21600`

## Edge conditions covered

- Duplicate draft creation is skipped by `userId + messageId`.
- Duplicate pending drafts are hidden in list responses.
- Draft usage count increments only for newly created drafts.
- Approved and sent drafts cannot be edited, rewritten, rejected, or sent.
- Approving an already approved draft is idempotent.
- Approved drafts are stored in Gmail Drafts and audit metadata records Gmail draft IDs.
- Frontend never calls AI service directly.
- Onboarding completion stores `onboardingComplete`, timestamps, audit log, preferences, and reviewed style profile.
- Plan limits are served from backend config through `/api/config`.

## Required production env

Set these before running real services:

- `OPENROUTER_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `NEXTAUTH_URL`
- `NODE_SERVICE_URL`
- `GCP_PROJECT_ID`
- `GMAIL_WATCH_TOPIC`
- Stripe env vars if billing is enabled
