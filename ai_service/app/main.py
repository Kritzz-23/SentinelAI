import re
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SentinelAI Intelligence Service", version="1.0.0")

class IncidentInput(BaseModel):
    title: str
    description: str = ""
    service: str
    logs: str = ""
    severity: str = "medium"

ERROR_PATTERNS = {
    "database": (r"timeout|deadlock|connection refused|too many connections|postgres|mysql", "Database connectivity or saturation is a likely contributor."),
    "memory": (r"out of memory|oom|heap|memory limit|killed", "Memory pressure or a memory leak is a likely contributor."),
    "latency": (r"latency|slow|timed out|504|gateway timeout", "A latency or downstream dependency issue is a likely contributor."),
    "auth": (r"401|403|unauthorized|forbidden|token expired", "Authentication/authorization configuration may be contributing."),
    "deployment": (r"deployment|rollout|release|version|image pull", "A recent deployment or version change may be contributing."),
}

@app.get("/health")
async def health(): return {"status": "ok", "service": "sentinel-ai"}

@app.post("/analyze")
async def analyze(data: IncidentInput):
    text = f"{data.title} {data.description} {data.logs}".lower()
    matched = [(k, msg) for k, (pattern, msg) in ERROR_PATTERNS.items() if re.search(pattern, text)]
    if matched:
        root = matched[0][1]
        signals = ", ".join(k for k, _ in matched)
        summary = f"Incident affects {data.service} and contains signals associated with {signals}. Automated analysis indicates the primary area to investigate is {matched[0][0]}."
    else:
        root = "Insufficient diagnostic signals. Correlate application logs, metrics, traces, and recent changes."
        summary = f"Incident detected in {data.service}. No high-confidence signature was found in the supplied logs."
    recommendations = [
        "Check the incident timeline against recent deployments and configuration changes.",
        f"Inspect {data.service} logs and metrics around the first error timestamp.",
        "Validate downstream dependencies and resource saturation before restarting services.",
        "Document the confirmed root cause and add a regression signal/runbook after resolution.",
    ]
    if any(k == "database" for k, _ in matched): recommendations.insert(0, "Check database connection pool usage, slow queries, locks, and database health.")
    if any(k == "memory" for k, _ in matched): recommendations.insert(0, "Inspect memory usage, container limits, heap growth, and OOM events.")
    return {"summary": summary, "root_cause": root, "recommendations": recommendations, "confidence": 0.72 if matched else 0.31}
