from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.media import MediaItem
from app.models.schemas import MediaItemRead

router = APIRouter(prefix="/media", tags=["Media"])

@router.get("", response_model=List[MediaItemRead])
def list_media_items(
    media_type: Optional[str] = Query(None, description="Filter by media_type: book, movie, concert"),
    search: Optional[str] = Query(None, description="Search by title"),
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),

    session: Session = Depends(get_session)
):
    query = select(MediaItem)
    if media_type:
        query = query.where(MediaItem.media_type == media_type)
    if search:
        query = query.where(MediaItem.title.ilike(f"%{search}%"))
        
    query = query.order_by(MediaItem.created_at.desc()).offset(offset).limit(limit)
    items = session.exec(query).all()
    return [
        MediaItemRead(
            id=item.id,
            media_type=item.media_type,
            title=item.title,
            metadata_json=item.metadata_json,
            created_at=item.created_at
        ) for item in items
    ]

@router.get("/{media_id}", response_model=MediaItemRead)
def get_media_item(media_id: str, session: Session = Depends(get_session)):
    item = session.get(MediaItem, media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media item not found")
    return MediaItemRead(
        id=item.id,
        media_type=item.media_type,
        title=item.title,
        metadata_json=item.metadata_json,
        created_at=item.created_at
    )
