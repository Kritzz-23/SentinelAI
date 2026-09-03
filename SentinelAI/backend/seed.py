import asyncio
from sqlalchemy import select
from app.core.db import SessionLocal
from app.models.user import User
from app.models.incident import Incident

async def main():
    async with SessionLocal() as s:
        user=await s.scalar(select(User).where(User.email=='admin@sentinel.local'))
        if not user: print('Run the API once with SEED_DEMO=true first.'); return
        exists=await s.scalar(select(Incident).where(Incident.title=='Checkout API latency spike'))
        if not exists:
            s.add(Incident(title='Checkout API latency spike',description='Customers are seeing intermittent checkout failures.',severity='critical',status='open',service='payments-api',logs='504 Gateway Timeout\nDatabase connection timeout\nlatency p95 > 4s',created_by=user.id))
            await s.commit(); print('Seeded demo incident.')

asyncio.run(main())
