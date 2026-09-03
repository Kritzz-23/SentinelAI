# SentinelAI Architecture

## Request flow
1. React dashboard calls the NestJS gateway.
2. NestJS forwards API traffic to the FastAPI application service.
3. FastAPI authenticates requests with JWT and persists incidents in PostgreSQL.
4. Incident mutations publish domain events to RabbitMQ.
5. Connected dashboards receive WebSocket updates.
6. The AI service analyzes incident evidence and returns structured findings.
7. Redis is available for caching/rate limiting and can be expanded into a distributed coordination layer.

## AI approach
The current intelligence service uses a deterministic, explainable rule-based baseline so the repository works without an API key. It is intentionally structured as a separate service so an LLM provider and vector database can be introduced without coupling model logic to the incident API.

Future milestones:
- Embeddings + pgvector/Qdrant
- RAG over runbooks/postmortems
- Tool-using incident investigation agent
- OpenTelemetry traces
- Kubernetes deployment
- Alert ingestion from Prometheus/Grafana/PagerDuty-style sources
