from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body, Query, status
import httpx
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import get_session
from app.models.media import SyncJob
from app.models.schemas import SyncJobRead
from app.services.importers import import_goodreads_csv, import_storygraph_csv, import_letterboxd_csv, poll_letterboxd_rss, sync_setlist_fm

router = APIRouter(tags=["Sync & Importers"])

@router.post("/importers/storygraph/upload", response_model=SyncJobRead)
async def upload_storygraph_csv(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    content = (await file.read()).decode("utf-8", errors="ignore")
    return await import_storygraph_csv(session, content)

@router.post("/importers/goodreads/upload", response_model=SyncJobRead)
async def upload_goodreads_csv(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    content = (await file.read()).decode("utf-8", errors="ignore")
    return await import_goodreads_csv(session, content)


@router.post("/importers/letterboxd/upload", response_model=SyncJobRead)
async def upload_letterboxd_csv(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    content = (await file.read()).decode("utf-8", errors="ignore")
    return await import_letterboxd_csv(session, content, filename=file.filename)


@router.post("/connectors/letterboxd/poll", response_model=SyncJobRead)
async def poll_letterboxd_feed(
    rss_url: Optional[str] = Body(None, embed=True),
    session: Session = Depends(get_session)
):
    target_url = rss_url or settings.LETTERBOXD_RSS_URL
    if not target_url:
        raise HTTPException(status_code=400, detail="Letterboxd RSS URL is not provided in request or configuration")
        
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(target_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to fetch RSS feed, status: {resp.status_code}")
            return await poll_letterboxd_rss(session, resp.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error polling RSS feed: {str(e)}")

@router.post("/connectors/setlist-fm/sync", response_model=SyncJobRead)
async def trigger_setlist_fm_sync(
    user_id: Optional[str] = Body(None, embed=True),
    session: Session = Depends(get_session)
):
    target_user_id = user_id or settings.SETLIST_FM_USER_ID
    target_api_key = settings.SETLIST_FM_API_KEY
    
    if not target_user_id or not target_api_key:
        raise HTTPException(status_code=400, detail="setlist.fm user_id or SETLIST_FM_API_KEY is missing")
        
    return await sync_setlist_fm(session, target_user_id, target_api_key)

@router.get("/sync/jobs", response_model=List[SyncJobRead])
def list_sync_jobs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session)
):
    query = select(SyncJob).order_by(SyncJob.triggered_at.desc()).offset(offset).limit(limit)
    jobs = session.exec(query).all()
    return [
        SyncJobRead(
            id=job.id,
            connector_name=job.connector_name,
            status=job.status,
            records_processed=job.records_processed,
            error_message=job.error_message,
            triggered_at=job.triggered_at
        ) for job in jobs
    ]
