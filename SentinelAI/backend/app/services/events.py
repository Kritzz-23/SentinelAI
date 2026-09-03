import json
import aio_pika
from app.core.config import settings

async def publish_event(event: dict):
    try:
        connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange("sentinel.events", aio_pika.ExchangeType.FANOUT, durable=True)
            await exchange.publish(aio_pika.Message(json.dumps(event).encode()), routing_key="incident")
    except Exception:
        # Infrastructure is optional during local unit/demo runs.
        return
