import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import httpx
from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.services.importers import sync_setlist_fm, poll_letterboxd_rss

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def scheduled_sync_job():
    logger.info("Executing scheduled sync background task...")
    with Session(engine) as session:
        if settings.SETLIST_FM_USER_ID and settings.SETLIST_FM_API_KEY:
            logger.info("Running scheduled setlist.fm sync...")
            await sync_setlist_fm(session, settings.SETLIST_FM_USER_ID, settings.SETLIST_FM_API_KEY)
        
        if settings.LETTERBOXD_RSS_URL:
            logger.info("Running scheduled Letterboxd RSS poll...")
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.get(settings.LETTERBOXD_RSS_URL)
                    if resp.status_code == 200:
                        await poll_letterboxd_rss(session, resp.text)
            except Exception as e:
                logger.error(f"Scheduled Letterboxd RSS poll error: {e}")

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(scheduled_sync_job, 'interval', hours=24, id='daily_sync_job', replace_existing=True)
        scheduler.start()
        logger.info("APScheduler started successfully (interval: 24 hours).")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
