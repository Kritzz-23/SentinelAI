from sqlalchemy import String, Text, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str] = mapped_column(Text())
    severity: Mapped[str] = mapped_column(String(20), default="medium", index=True)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    service: Mapped[str] = mapped_column(String(100), index=True)
    logs: Mapped[str] = mapped_column(Text(), default="")
    ai_summary: Mapped[str | None] = mapped_column(Text(), nullable=True)
    ai_root_cause: Mapped[str | None] = mapped_column(Text(), nullable=True)
    ai_recommendations: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_by: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
