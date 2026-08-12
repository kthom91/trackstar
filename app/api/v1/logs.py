from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session, select, func

from app.core.db import get_session
from app.models.media import MediaItem, UserLog
from app.models.schemas import UserLogCreate, UserLogUpdate, UserLogRead, MediaItemRead

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("", response_model=List[UserLogRead])
def list_logs(
    response: Response,
    media_type: Optional[str] = Query(None, description="Filter by book, movie, or concert"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by want_to_consume, consuming, completed"),
    exclude_status: Optional[str] = Query(None, description="Exclude a status"),
    search: Optional[str] = Query(None, description="Search by title"),
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session)
):
    # Base query for count and results
    base_query = select(UserLog, MediaItem).join(MediaItem, UserLog.media_item_id == MediaItem.id)
    
    if media_type:
        base_query = base_query.where(MediaItem.media_type == media_type)
    if status_filter:
        base_query = base_query.where(UserLog.status == status_filter)
    elif exclude_status:
        base_query = base_query.where(UserLog.status != exclude_status)
    if search:
        base_query = base_query.where(MediaItem.title.ilike(f"%{search}%"))

        
    # Count total matching records
    count_query = select(func.count()).select_from(base_query.subquery())
    total_count = session.exec(count_query).one()
    response.headers["X-Total-Count"] = str(total_count)

    query = base_query.order_by(func.coalesce(UserLog.completed_at, UserLog.logged_at).desc(), UserLog.logged_at.desc()).offset(offset).limit(limit)
    results = session.exec(query).all()

    response_list = []
    for user_log, media_item in results:
        res = UserLogRead(
            id=user_log.id,
            media_item_id=user_log.media_item_id,
            status=user_log.status,
            rating=user_log.rating,
            review=user_log.review,
            logged_at=user_log.logged_at,
            completed_at=user_log.completed_at,
            synced_to_pds=user_log.synced_to_pds,
            at_uri=user_log.at_uri,
            at_cid=user_log.at_cid,
            media_item=MediaItemRead(
                id=media_item.id,
                media_type=media_item.media_type,
                title=media_item.title,
                metadata_json=media_item.metadata_json or {},
                created_at=media_item.created_at
            )
        )
        response_list.append(res)
    
    return response_list

@router.post("", response_model=UserLogRead, status_code=status.HTTP_201_CREATED)
def create_log(payload: UserLogCreate, session: Session = Depends(get_session)):
    # 1. Resolve or create MediaItem
    media_item = None
    if payload.media_item_id:
        media_item = session.get(MediaItem, payload.media_item_id)
        
    if not media_item:
        media_id = payload.media_item_id or f"{payload.media_type}:{payload.title.lower().replace(' ', '_')}"
        media_item = MediaItem(
            id=media_id,
            media_type=payload.media_type,
            title=payload.title,
            metadata_json=payload.metadata_json or {}
        )
        session.add(media_item)
        session.commit()
        session.refresh(media_item)
        
    user_log = UserLog(
        media_item_id=media_item.id,
        status=payload.status,
        rating=payload.rating,
        review=payload.review,
        logged_at=payload.logged_at or func.now(),
        completed_at=payload.completed_at
    )
    session.add(user_log)
    session.commit()
    session.refresh(user_log)

    return UserLogRead(
        id=user_log.id,
        media_item_id=user_log.media_item_id,
        status=user_log.status,
        rating=user_log.rating,
        review=user_log.review,
        logged_at=user_log.logged_at,
        completed_at=user_log.completed_at,
        synced_to_pds=user_log.synced_to_pds,
        at_uri=user_log.at_uri,
        at_cid=user_log.at_cid,
        media_item=MediaItemRead(
            id=media_item.id,
            media_type=media_item.media_type,
            title=media_item.title,
            metadata_json=media_item.metadata_json or {},
            created_at=media_item.created_at
        )
    )


@router.get("/stats", response_model=Dict[str, int])
def get_log_stats(
    status: Optional[str] = Query(None),
    exclude_status: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    query = select(MediaItem.media_type, func.count(UserLog.id)).join(MediaItem, UserLog.media_item_id == MediaItem.id)
    if status:
        query = query.where(UserLog.status == status)
    if exclude_status:
        query = query.where(UserLog.status != exclude_status)
    query = query.group_by(MediaItem.media_type)
    results = session.exec(query).all()
    
    counts = {"book": 0, "movie": 0, "concert": 0}
    for m_type, count in results:
        if m_type in counts:
            counts[m_type] = count
    return counts



@router.get("/{log_id}", response_model=UserLogRead)
def get_log(log_id: str, session: Session = Depends(get_session)):

    result = session.exec(
        select(UserLog, MediaItem).join(MediaItem, UserLog.media_item_id == MediaItem.id).where(UserLog.id == log_id)
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Log entry not found")
        
    user_log, media_item = result
    return UserLogRead(
        id=user_log.id,
        media_item_id=user_log.media_item_id,
        status=user_log.status,
        rating=user_log.rating,
        review=user_log.review,
        logged_at=user_log.logged_at,
        synced_to_pds=user_log.synced_to_pds,
        at_uri=user_log.at_uri,
        at_cid=user_log.at_cid,
        media_item=MediaItemRead(
            id=media_item.id,
            media_type=media_item.media_type,
            title=media_item.title,
            metadata_json=media_item.metadata_json,
            created_at=media_item.created_at
        )
    )

@router.patch("/{log_id}", response_model=UserLogRead)
def update_log(log_id: str, payload: UserLogUpdate, session: Session = Depends(get_session)):
    result = session.exec(
        select(UserLog, MediaItem).join(MediaItem, UserLog.media_item_id == MediaItem.id).where(UserLog.id == log_id)
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Log entry not found")
        
    user_log, media_item = result
    if payload.status is not None:
        user_log.status = payload.status
    if payload.rating is not None:
        user_log.rating = payload.rating
    if payload.review is not None:
        user_log.review = payload.review
    if payload.logged_at is not None:
        user_log.logged_at = payload.logged_at
        
    session.add(user_log)
    session.commit()
    session.refresh(user_log)
    
    return UserLogRead(
        id=user_log.id,
        media_item_id=user_log.media_item_id,
        status=user_log.status,
        rating=user_log.rating,
        review=user_log.review,
        logged_at=user_log.logged_at,
        synced_to_pds=user_log.synced_to_pds,
        at_uri=user_log.at_uri,
        at_cid=user_log.at_cid,
        media_item=MediaItemRead(
            id=media_item.id,
            media_type=media_item.media_type,
            title=media_item.title,
            metadata_json=media_item.metadata_json,
            created_at=media_item.created_at
        )
    )

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(log_id: str, session: Session = Depends(get_session)):
    user_log = session.get(UserLog, log_id)
    if not user_log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    session.delete(user_log)
    session.commit()
    return None
