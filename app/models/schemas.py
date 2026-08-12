from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class MediaItemRead(BaseModel):
    id: str
    media_type: str
    title: str
    metadata_json: Dict[str, Any]
    created_at: datetime

class UserLogCreate(BaseModel):
    media_item_id: Optional[str] = None
    media_type: str  # "book", "movie", "concert"
    title: str
    metadata_json: Optional[Dict[str, Any]] = None
    status: str  # "want_to_consume", "consuming", "completed"
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    review: Optional[str] = None
    logged_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class UserLogUpdate(BaseModel):
    status: Optional[str] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    review: Optional[str] = None
    logged_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class UserLogRead(BaseModel):
    id: str
    media_item_id: str
    status: str
    rating: Optional[int]
    review: Optional[str]
    logged_at: datetime
    completed_at: Optional[datetime] = None
    synced_to_pds: bool
    at_uri: Optional[str]
    at_cid: Optional[str]
    media_item: Optional[MediaItemRead] = None


class SyncJobRead(BaseModel):
    id: Optional[int]
    connector_name: str
    status: str
    records_processed: int
    error_message: Optional[str]
    triggered_at: datetime
