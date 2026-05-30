# AI Email Microservice

A Python/FastAPI microservice with two AI-powered functions backed by PostgreSQL (Prisma) and RabbitMQ.

## Services

| Service              | Transport                      | Description                                                |
| -------------------- | ------------------------------ | ---------------------------------------------------------- |
| **Reply Classifier** | `POST /classify` (sync REST)   | Decides `needsReply` + `priority` + `reason` via Anthropic |
| **Draft Generator**  | RabbitMQ `draft.queue` (async) | Generates reply drafts, persists to `email_drafts` table   |

## Message Flow

```
Inbound email
  → IO service
  → POST /classify        (sync, ~1-2 s)
      needsReply: false → discard
      needsReply: true  → publish to draft.queue
                            → draft consumer
                            → AI generates draft
                            → saved to email_drafts (status: pending)
```

## Project Structure

```
src/
├── config/          # Pydantic-validated settings, RabbitMQ factory
├── http/            # FastAPI server + POST /classify route
├── consumers/       # draft_consumer.py
├── services/        # classifier_service, draft_service, email_draft_repo
├── prompts/         # Versioned prompt builders (classifier + draft)
├── schemas/         # Pydantic RabbitMQ message envelope
└── lib/             # Singleton Anthropic client, Prisma client, logger
prisma/
└── schema.prisma    # EmailDraft model
```

## Setup

### 1. Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in ANTHROPIC_API_KEY and DATABASE_URL at minimum
```

### 3. Generate Prisma client & run migrations

```bash
prisma generate
prisma db push          # dev: push schema without migration history
# or for production:
prisma migrate deploy
```

### 4. Run

```bash
python -m app.main
# or
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

API docs available at `http://localhost:8000/docs`

## API

### `POST /classify`

```json
// Request
{
  "subject": "Re: Q3 budget review",
  "fromEmail": "alice@example.com",
  "body": "Hi, can we jump on a call this week?"
}

// Response
{
  "needsReply": true,
  "priority": "high",
  "reason": "Direct request for a meeting from a stakeholder."
}
```

**Timeouts:** Anthropic SDK: 8 s · Client-side guard: 10 s → returns `504` on breach.

### `GET /health`

```json
{ "status": "ok", "service": "ai-email-microservice" }
```

## Prompt Versioning

Prompts live in `src/prompts/`. Each file has a dispatch table keyed by version string (`v1`, `v2`, …).

- The active version is set via `PROMPT_VERSION` env var
- Every `EmailDraft` row records `promptVersion` for A/B testing and audit
- To add a new version: implement `_v2(...)` and add it to `_VERSIONS` — no service code changes needed

## RabbitMQ Topology

```
email.topic (topic exchange)
  └─ draft.queue  [routing key: email.draft]
        └─ x-dead-letter-exchange → email.dlx
                                        └─ draft.dlq
```

Failed messages retry up to `MAX_RETRIES=3` times, then route to `draft.dlq`.

## Database Schema

```prisma
model EmailDraft {
  id            String   // cuid
  userId        String
  messageId     String   @unique
  threadId      String
  subject       String
  fromEmail     String
  aiDraft       String   // generated reply text
  promptVersion String   // for A/B testing
  priority      String   // high | medium | low
  status        String   // pending | approved | sent | discarded
  createdAt     DateTime
  updatedAt     DateTime
}
```
