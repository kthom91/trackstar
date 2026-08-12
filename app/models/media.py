from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
from sqlmodel import SQLModel, Field, JSON, Column

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class MediaItem(SQLModel, table=True):
    __tablename__ = "media_items"

    id: str = Field(primary_key=True)  # e.g., "isbn:9780593135204", "tmdb:671", "setlist:12345"
    media_type: str = Field(index=True)  # "book", "movie", "concert"
    title: str = Field(index=True)
    metadata_json: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utc_now)

class UserLog(SQLModel, table=True):
    __tablename__ = "user_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    media_item_id: str = Field(foreign_key="media_items.id", index=True)
    status: str = Field(index=True)  # "want_to_consume", "consuming", "completed"
    rating: Optional[int] = Field(default=None)  # 1 to 5 scale
    review: Optional[str] = Field(default=None)
    logged_at: datetime = Field(default_factory=utc_now)
    completed_at: Optional[datetime] = Field(default=None, index=True)

    # Track Meet / AT Protocol Migration Fields

    at_uri: Optional[str] = Field(default=None, unique=True, index=True)
    at_cid: Optional[str] = Field(default=None)
    synced_to_pds: bool = Field(default=False, index=True)

class SyncJob(SQLModel, table=True):
    __tablename__ = "sync_jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    connector_name: str = Field(index=True)  # "goodreads", "letterboxd", "setlist_fm"
    status: str  # "pending", "running", "success", "failed"
    records_processed: int = Field(default=0)
    error_message: Optional[str] = Field(default=None)
    triggered_at: datetime = Field(default_factory=utc_now)
