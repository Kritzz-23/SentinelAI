from datetime import datetime
from pydantic import BaseModel, Field

class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = ""
    severity: str = "medium"
    service: str
    logs: str = ""

class IncidentUpdate(BaseModel):
    status: str | None = None
    severity: str | None = None
    description: str | None = None
    logs: str | None = None

class IncidentOut(BaseModel):
    id: int
    title: str
    description: str
    severity: str
    status: str
    service: str
    logs: str
    ai_summary: str | None
    ai_root_cause: str | None
    ai_recommendations: str | None
    created_by: int
    created_at: datetime
    model_config = {"from_attributes": True}
