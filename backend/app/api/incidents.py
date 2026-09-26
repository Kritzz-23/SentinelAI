import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import db, current_user
from app.core.config import settings
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentOut
from app.services.events import publish_event

router = APIRouter(prefix="/incidents", tags=["Incidents"])
clients: set[WebSocket] = set()

async def broadcast(payload):
    dead = []
    for ws in clients:
        try: await ws.send_json(payload)
        except Exception: dead.append(ws)
    for ws in dead: clients.discard(ws)

@router.get("", response_model=list[IncidentOut])
async def list_incidents(session: AsyncSession = Depends(db), user: User = Depends(current_user)):
    rows = (await session.scalars(select(Incident).order_by(desc(Incident.created_at)))).all()
    return rows

@router.post("", response_model=IncidentOut, status_code=201)
async def create_incident(data: IncidentCreate, session: AsyncSession = Depends(db), user: User = Depends(current_user)):
    incident = Incident(**data.model_dump(), created_by=user.id)
    session.add(incident); await session.commit(); await session.refresh(incident)
    event = {"type": "incident.created", "incident_id": incident.id, "severity": incident.severity, "service": incident.service}
    await publish_event(event); await broadcast(event)
    return incident

@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(incident_id: int, session: AsyncSession = Depends(db), user: User = Depends(current_user)):
    incident = await session.get(Incident, incident_id)
    if not incident: raise HTTPException(404, "Incident not found")
    return incident

@router.patch("/{incident_id}", response_model=IncidentOut)
async def update_incident(incident_id: int, data: IncidentUpdate, session: AsyncSession = Depends(db), user: User = Depends(current_user)):
    incident = await session.get(Incident, incident_id)
    if not incident: raise HTTPException(404, "Incident not found")
    for key, value in data.model_dump(exclude_none=True).items(): setattr(incident, key, value)
    await session.commit(); await session.refresh(incident)
    event = {"type": "incident.updated", "incident_id": incident.id, "status": incident.status, "severity": incident.severity}
    await publish_event(event); await broadcast(event)
    return incident

@router.post("/{incident_id}/analyze", response_model=IncidentOut)
async def analyze_incident(incident_id: int, session: AsyncSession = Depends(db), user: User = Depends(current_user)):
    incident = await session.get(Incident, incident_id)
    if not incident: raise HTTPException(404, "Incident not found")
    payload = {"title": incident.title, "description": incident.description, "service": incident.service, "logs": incident.logs, "severity": incident.severity}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{settings.ai_service_url}/analyze", json=payload)
        response.raise_for_status()
        ai = response.json()
    incident.ai_summary = ai["summary"]
    incident.ai_root_cause = ai["root_cause"]
    incident.ai_recommendations = json.dumps(ai["recommendations"])
    await session.commit(); await session.refresh(incident)
    await broadcast({"type": "incident.analyzed", "incident_id": incident.id})
    return incident

@router.websocket("/ws/incidents")
async def incident_socket(websocket: WebSocket):
    await websocket.accept(); clients.add(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect: clients.discard(websocket)
