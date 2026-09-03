# SentinelAI 🚨🤖

AI-powered real-time incident management platform built as a production-style learning project.

## What it demonstrates
- Incident lifecycle management
- JWT authentication and role-based access control
- PostgreSQL persistence
- Redis-backed caching and rate limiting
- RabbitMQ event publishing
- WebSocket real-time incident updates
- Python/FastAPI AI service with deterministic fallback analysis
- Optional LLM + RAG hooks
- React + TypeScript dashboard
- Docker Compose local infrastructure
- CI pipeline

## Architecture
```text
React + TypeScript
        │ REST / WebSocket
        ▼
NestJS-style API layer (FastAPI implementation for MVP)
        │
   ┌────┼───────────────┐
   ▼    ▼               ▼
Postgres Redis       RabbitMQ
        │               │
        └──────┬────────┘
               ▼
       Python AI Service
       ├─ log analysis
       ├─ incident summarization
       ├─ knowledge retrieval (RAG-ready)
       └─ recommendations
```

## Quick start

### 1. Clone and configure
```bash
git clone <your-repo-url>
cd SentinelAI
cp .env.example .env
```

### 2. Start infrastructure
```bash
docker compose up --build
```

Frontend: http://localhost:5173  
API docs: http://localhost:8000/docs  
AI service docs: http://localhost:8001/docs  
RabbitMQ UI: http://localhost:15672 (guest/guest)

### Demo account
- Email: `admin@sentinel.local`
- Password: `Admin@123`

The API creates this account on startup only when `SEED_DEMO=true`.

## API highlights
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/incidents`
- `POST /api/v1/incidents`
- `GET /api/v1/incidents/{id}`
- `PATCH /api/v1/incidents/{id}`
- `POST /api/v1/incidents/{id}/analyze`
- `GET /api/v1/health`
- `WS /ws/incidents`

## Environment
See `.env.example`. `OPENAI_API_KEY` is optional. Without it, SentinelAI uses a deterministic local analyzer so the complete demo works without paid APIs.

## Important
This repository is intentionally honest about its scope: it is a portfolio-grade MVP, not a claim of a battle-tested production platform. Features such as Kubernetes deployment, distributed tracing, and a vector database can be added as future milestones.
