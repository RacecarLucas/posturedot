# PostureDot Cloudflare Workers Backend

Cloudflare Workers + D1 version of the PostureDot API. This replaces the Python/FastAPI backend for environments where you cannot use a traditional server.

**Limitations vs Python backend**
- No WebSocket live broadcast (REST only). The frontend still sends frames via HTTP POST every 100 ms.
- D1 free tier has daily read/write limits (sufficient for personal use).

## Prerequisites

- Node.js 18+
- A Cloudflare account (free)

## Setup

```bash
cd backend-workers
npm install
cp wrangler.toml.example wrangler.toml
```

## Create D1 database

```bash
npx wrangler d1 create posturedot-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "posturedot-db"
database_id = "your-database-id-here"
```

## Initialize schema

```bash
npx wrangler d1 execute posturedot-db --file=./schema.sql
```

## Local development

```bash
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

After deploy, Workers gives you a URL like `https://posturedot-api.your-account.workers.dev`.

Set that URL as `VITE_API_URL` in the frontend `.env` file:

```
VITE_API_URL=https://posturedot-api.your-account.workers.dev
```

Then rebuild and deploy the frontend.

## API Endpoints

Same as the Python backend:

- `POST /api/landmarks` - Save a frame
- `GET /api/sessions/:id/summary` - Session summary
- `GET /api/sessions/:id/frames` - Session frames
- `GET /health` - Health check

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DB` | D1 database binding (configured in `wrangler.toml`) |

## Free Tier Limits

Cloudflare Workers free plan includes 100,000 requests/day and D1 includes 500,000 rows read/day and 100,000 rows written/day. This is plenty for personal posture capture sessions.
