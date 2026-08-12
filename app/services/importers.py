import csv
import io
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import httpx
from sqlmodel import Session, select

from app.models.media import MediaItem, UserLog, SyncJob
from app.services.metadata import fetch_open_library_metadata, fetch_tmdb_metadata, fetch_setlist_fm_attended

logger = logging.getLogger(__name__)

_THEAUDIODB_CACHE: Dict[str, Optional[str]] = {}

async def fetch_theaudiodb_band_image(artist_name: str) -> Optional[str]:
    """Fetch high-res band image from TheAudioDB free API."""
    if not artist_name:
        return None
    cache_key = artist_name.lower().strip()
    if cache_key in _THEAUDIODB_CACHE:
        return _THEAUDIODB_CACHE[cache_key]

    try:
        url = "https://www.theaudiodb.com/api/v1/json/2/search.php"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params={"s": artist_name})
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data.get("artists"), list) and len(data["artists"]) > 0:
                    artist = data["artists"][0]
                    img_url = artist.get("strArtistThumb") or artist.get("strArtistFanart") or artist.get("strArtistBanner")
                    if img_url:
                        _THEAUDIODB_CACHE[cache_key] = img_url
                        return img_url
    except Exception as e:
        logger.warning(f"TheAudioDB lookup failed for {artist_name}: {e}")

    _THEAUDIODB_CACHE[cache_key] = None
    return None


STATUS_MAP_GOODREADS = {
    "to-read": "want_to_consume",
    "currently-reading": "consuming",
    "read": "completed"
}

def parse_rating(rating_str: Optional[str]) -> Optional[int]:
    if not rating_str:
        return None
    try:
        r = float(rating_str)
        val = int(round(r))
        return max(1, min(5, val)) if val > 0 else None
    except ValueError:
        return None

def parse_date_string(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    clean_str = str(date_str).strip()
    formats = [
        "%d-%m-%Y",                  # setlist.fm: "23-08-2024"
        "%Y-%m-%d",                  # Letterboxd: "2024-08-23" or ISO
        "%Y/%m/%d",                  # Goodreads: "2024/08/23"
        "%a, %d %b %Y %H:%M:%S %z",  # RSS: "Wed, 23 Aug 2024 12:00:00 +0000"
        "%a, %d %b %Y %H:%M:%S GMT",
        "%d %b %Y",                  # "23 Aug 2024"
        "%B %d, %Y",                 # "August 23, 2024"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(clean_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None

def repair_concert_log_dates(session: Session) -> int:
    """Repair completed_at dates for existing concert entries from event_date metadata."""
    logs_query = select(UserLog, MediaItem).join(MediaItem, UserLog.media_item_id == MediaItem.id).where(MediaItem.media_type == "concert")
    results = session.exec(logs_query).all()
    repaired = 0
    for user_log, media_item in results:
        meta = media_item.metadata_json or {}
        event_date_str = meta.get("event_date") or (meta.get("raw", {}).get("eventDate") if isinstance(meta.get("raw"), dict) else None)
        if event_date_str:
            dt = parse_date_string(event_date_str)
            if dt and user_log.completed_at != dt:
                user_log.completed_at = dt
                session.add(user_log)
                repaired += 1
    if repaired > 0:
        session.commit()
        logger.info(f"Repaired completed_at dates for {repaired} concert logs.")
    return repaired

STATUS_MAP_STORYGRAPH = {
    "to-read": "want_to_consume",
    "currently-reading": "consuming",
    "read": "completed"
}

async def import_storygraph_csv(session: Session, csv_content: str) -> SyncJob:
    sync_job = SyncJob(connector_name="storygraph", status="running")
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)

    records_processed = 0
    try:
        reader = csv.DictReader(io.StringIO(csv_content))
        for row in reader:
            title = row.get("Title", "").strip()
            if not title:
                continue
            
            author = row.get("Authors", "").strip() or row.get("Author", "").strip()
            isbn_raw = row.get("ISBN/UID", "").replace('="', '').replace('"', '').strip() or row.get("ISBN", "").strip()
            clean_isbn = "".join(filter(str.isdigit, isbn_raw))

            if clean_isbn and len(clean_isbn) in (10, 13):
                media_id = f"isbn:{clean_isbn}"
            elif isbn_raw:
                media_id = f"storygraph:{isbn_raw}"
            else:
                media_id = f"book:{title.lower().replace(' ', '_')}"

            # Build metadata instantly
            cover_url = f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-L.jpg" if clean_isbn and len(clean_isbn) in (10, 13) else None
            metadata = {
                "author": author,
                "isbn": clean_isbn if clean_isbn else None,
                "format": row.get("Format", "").strip(),
                "moods": row.get("Moods", "").strip(),
                "pace": row.get("Pace", "").strip(),
                "tags": row.get("Tags", "").strip(),
                "cover_url": cover_url,
                "source": "storygraph"
            }
            media_item = session.get(MediaItem, media_id)
            if not media_item:


                media_item = MediaItem(
                    id=media_id,
                    media_type="book",
                    title=title,
                    metadata_json=metadata
                )
                session.add(media_item)
                session.commit()
                session.refresh(media_item)
            else:
                media_item.metadata_json = metadata
                session.add(media_item)


            # Determine log status, rating, review, and date
            raw_status = row.get("Read Status", "").strip().lower()
            status = STATUS_MAP_STORYGRAPH.get(raw_status, "completed")
            rating = parse_rating(row.get("Star Rating") or row.get("My Rating"))
            review = row.get("Review", "").strip() or row.get("My Review", "").strip() or None
            
            date_added_str = row.get("Date Added", "").strip()
            logged_at = parse_date_string(date_added_str) or datetime.now(timezone.utc)
            
            date_completed_str = (
                row.get("Last Date Read", "").strip() or 
                row.get("Dates Read", "").strip() or 
                row.get("Date Read", "").strip()
            )
            completed_at = parse_date_string(date_completed_str)

            # Create or update UserLog
            existing_log = session.exec(
                select(UserLog).where(UserLog.media_item_id == media_item.id)
            ).first()

            if not existing_log:
                user_log = UserLog(
                    media_item_id=media_item.id,
                    status=status,
                    rating=rating,
                    review=review,
                    logged_at=logged_at,
                    completed_at=completed_at
                )
                session.add(user_log)
            else:
                existing_log.status = status
                existing_log.logged_at = logged_at
                if completed_at:
                    existing_log.completed_at = completed_at
                if rating is not None:
                    existing_log.rating = rating
                if review:
                    existing_log.review = review
                session.add(existing_log)


            records_processed += 1

        session.commit()
        sync_job.status = "success"
        sync_job.records_processed = records_processed
    except Exception as e:
        session.rollback()
        logger.error(f"StoryGraph CSV import failed: {e}", exc_info=True)
        sync_job.status = "failed"
        sync_job.error_message = str(e)
    
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)
    return sync_job

async def import_goodreads_csv(session: Session, csv_content: str) -> SyncJob:
    # Also reuse storygraph parser if header matches StoryGraph
    if "Read Status" in csv_content or "ISBN/UID" in csv_content:
        return await import_storygraph_csv(session, csv_content)

    sync_job = SyncJob(connector_name="goodreads", status="running")
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)

    records_processed = 0
    try:
        reader = csv.DictReader(io.StringIO(csv_content))
        for row in reader:
            title = row.get("Title", "").strip()
            if not title:
                continue
            
            author = row.get("Author", "").strip()
            isbn_raw = row.get("ISBN13", "").replace('="', '').replace('"', '').strip() or row.get("ISBN", "").replace('="', '').replace('"', '').strip()
            clean_isbn = "".join(filter(str.isdigit, isbn_raw))
            book_id = row.get("Book Id", "").strip()

            if clean_isbn:
                media_id = f"isbn:{clean_isbn}"
            elif book_id:
                media_id = f"goodreads:{book_id}"
            else:
                media_id = f"book:{title.lower().replace(' ', '_')}"

            # Fetch existing media item or create
            media_item = session.get(MediaItem, media_id)
            metadata = {}
            if clean_isbn:
                ol_meta = await fetch_open_library_metadata(clean_isbn)
                if ol_meta:
                    metadata.update(ol_meta)

            if not metadata:
                metadata = {
                    "author": author,
                    "isbn": clean_isbn if clean_isbn else None,
                    "goodreads_id": book_id
                }

            if not media_item:
                media_item = MediaItem(
                    id=media_id,
                    media_type="book",
                    title=title,
                    metadata_json=metadata
                )
                session.add(media_item)
                session.commit()
                session.refresh(media_item)

            # Determine log status, rating, and date
            shelf = row.get("Exclusive Shelf", "").strip().lower()
            status = STATUS_MAP_GOODREADS.get(shelf, "completed")
            rating = parse_rating(row.get("My Rating"))
            review = row.get("My Review", "").strip() or None
            
            date_str = row.get("Date Read", "").strip() or row.get("Date Added", "").strip()
            logged_at = parse_date_string(date_str) or datetime.now(timezone.utc)

            # Create UserLog if not already logged
            existing_log = session.exec(
                select(UserLog).where(UserLog.media_item_id == media_item.id)
            ).first()

            if not existing_log:
                user_log = UserLog(
                    media_item_id=media_item.id,
                    status=status,
                    rating=rating,
                    review=review,
                    logged_at=logged_at
                )
                session.add(user_log)
            else:
                existing_log.status = status
                existing_log.logged_at = logged_at
                if rating is not None:
                    existing_log.rating = rating
                if review:
                    existing_log.review = review
                session.add(existing_log)

            records_processed += 1

        session.commit()
        sync_job.status = "success"
        sync_job.records_processed = records_processed
    except Exception as e:
        session.rollback()
        logger.error(f"Goodreads CSV import failed: {e}", exc_info=True)
        sync_job.status = "failed"
        sync_job.error_message = str(e)
    
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)
    return sync_job

async def import_letterboxd_csv(session: Session, csv_content: str, filename: Optional[str] = None) -> SyncJob:
    sync_job = SyncJob(connector_name="letterboxd_csv", status="running")
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)

    # Determine default status based on filename (watchlist.csv vs diary.csv / watched.csv)
    is_watchlist = bool(filename and "watchlist" in filename.lower())
    default_status = "want_to_consume" if is_watchlist else "completed"

    records_processed = 0
    try:
        reader = csv.DictReader(io.StringIO(csv_content))
        for row in reader:
            title = row.get("Name", "").strip() or row.get("Title", "").strip()
            if not title:
                continue
            
            year_str = row.get("Year", "").strip()
            year = int(year_str) if year_str.isdigit() else None
            rating = parse_rating(row.get("Rating"))
            review = row.get("Review", "").strip() or None
            letterboxd_uri = row.get("Letterboxd URI", "").strip() or row.get("URL", "").strip() or None
            tags = row.get("Tags", "").strip() or None
            rewatch = row.get("Rewatch", "").strip().lower() in ("yes", "true", "1")

            date_watched_str = row.get("Watched Date", "").strip() or row.get("Date", "").strip()
            date_added_str = row.get("Date Added", "").strip() or row.get("Date", "").strip()
            
            logged_at = parse_date_string(date_added_str) or datetime.now(timezone.utc)
            completed_at = parse_date_string(date_watched_str) if default_status == "completed" else None

            tmdb_meta = await fetch_tmdb_metadata(title=title, year=year)
            tmdb_id = tmdb_meta.get("tmdb_id")

            if tmdb_id:
                media_id = f"tmdb:{tmdb_id}"
            else:
                slug = f"{title}_{year}".lower().replace(" ", "_") if year else title.lower().replace(" ", "_")
                media_id = f"letterboxd:{slug}"

            metadata = tmdb_meta if tmdb_meta else {"year": year, "source": "letterboxd_csv"}
            if letterboxd_uri:
                metadata["letterboxd_url"] = letterboxd_uri
            if tags:
                metadata["tags"] = tags
            if rewatch:
                metadata["rewatch"] = True

            media_item = session.get(MediaItem, media_id)
            if not media_item:
                media_item = MediaItem(
                    id=media_id,
                    media_type="movie",
                    title=title,
                    metadata_json=metadata
                )
                session.add(media_item)
                session.commit()
                session.refresh(media_item)
            else:
                current_meta = dict(media_item.metadata_json or {})
                current_meta.update(metadata)
                media_item.metadata_json = current_meta
                session.add(media_item)

            existing_log = session.exec(
                select(UserLog).where(UserLog.media_item_id == media_item.id)
            ).first()

            if not existing_log:
                user_log = UserLog(
                    media_item_id=media_item.id,
                    status=default_status,
                    rating=rating,
                    review=review,
                    logged_at=logged_at,
                    completed_at=completed_at
                )
                session.add(user_log)
            else:
                if default_status == "completed":
                    existing_log.status = "completed"
                    if completed_at:
                        existing_log.completed_at = completed_at
                existing_log.logged_at = logged_at
                if rating is not None:
                    existing_log.rating = rating
                if review:
                    existing_log.review = review
                session.add(existing_log)

            records_processed += 1


        session.commit()
        sync_job.status = "success"
        sync_job.records_processed = records_processed
    except Exception as e:
        session.rollback()
        logger.error(f"Letterboxd CSV import failed: {e}", exc_info=True)
        sync_job.status = "failed"
        sync_job.error_message = str(e)
    
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)
    return sync_job


async def poll_letterboxd_rss(session: Session, rss_content: str) -> SyncJob:
    sync_job = SyncJob(connector_name="letterboxd_rss", status="running")
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)

    records_processed = 0
    try:
        root = ET.fromstring(rss_content)
        channel = root.find("channel")
        items = channel.findall("item") if channel is not None else root.findall(".//item")

        for item in items:
            title_elem = item.find("title")
            title_text = title_elem.text if title_elem is not None else ""
            
            film_title = title_text.split(" - ")[0] if " - " in title_text else title_text
            film_title = film_title.rsplit(",", 1)[0].strip() if "," in film_title else film_title.strip()
            
            if not film_title:
                continue

            pub_elem = item.find("pubDate")
            pub_str = pub_elem.text if pub_elem is not None else ""
            logged_at = parse_date_string(pub_str) or datetime.now(timezone.utc)

            tmdb_meta = await fetch_tmdb_metadata(title=film_title)
            tmdb_id = tmdb_meta.get("tmdb_id")

            if tmdb_id:
                media_id = f"tmdb:{tmdb_id}"
            else:
                media_id = f"letterboxd:{film_title.lower().replace(' ', '_')}"

            media_item = session.get(MediaItem, media_id)
            if not media_item:
                media_item = MediaItem(
                    id=media_id,
                    media_type="movie",
                    title=film_title,
                    metadata_json=tmdb_meta if tmdb_meta else {"source": "letterboxd_rss"}
                )
                session.add(media_item)
                session.commit()
                session.refresh(media_item)

            existing_log = session.exec(
                select(UserLog).where(UserLog.media_item_id == media_item.id)
            ).first()

            if not existing_log:
                user_log = UserLog(
                    media_item_id=media_item.id,
                    status="completed",
                    rating=None,
                    logged_at=logged_at
                )
                session.add(user_log)

            records_processed += 1

        session.commit()
        sync_job.status = "success"
        sync_job.records_processed = records_processed
    except Exception as e:
        session.rollback()
        logger.error(f"Letterboxd RSS poll failed: {e}", exc_info=True)
        sync_job.status = "failed"
        sync_job.error_message = str(e)

    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)
    return sync_job

async def sync_setlist_fm(session: Session, user_id: str, api_key: str) -> SyncJob:
    sync_job = SyncJob(connector_name="setlist_fm", status="running")
    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)

    records_processed = 0
    try:
        attended = await fetch_setlist_fm_attended(user_id, api_key)
        for item in attended:
            event_id = item.get("id")
            artist_name = item.get("artist", {}).get("name", "Unknown Artist")
            venue_info = item.get("venue", {})
            venue_name = venue_info.get("name", "")
            city_name = venue_info.get("city", {}).get("name", "")
            event_date = item.get("eventDate", "")

            title = f"{artist_name} at {venue_name}" if venue_name else f"{artist_name} Concert"
            media_id = f"setlist:{event_id}" if event_id else f"setlist:{artist_name}_{event_date}".lower().replace(" ", "_")

            completed_dt = parse_date_string(event_date)
            now_dt = datetime.now(timezone.utc)

            cover_url = await fetch_theaudiodb_band_image(artist_name)

            media_item = session.get(MediaItem, media_id)
            metadata = {
                "artist": artist_name,
                "venue": venue_name,
                "city": city_name,
                "event_date": event_date,
                "setlist_url": item.get("url"),
                "cover_url": cover_url,
                "poster_url": cover_url,
                "raw": item
            }

            if not media_item:
                media_item = MediaItem(
                    id=media_id,
                    media_type="concert",
                    title=title,
                    metadata_json=metadata
                )
                session.add(media_item)
                session.commit()
                session.refresh(media_item)
            else:
                media_item.metadata_json = metadata
                session.add(media_item)

            existing_log = session.exec(
                select(UserLog).where(UserLog.media_item_id == media_item.id)
            ).first()

            if not existing_log:
                user_log = UserLog(
                    media_item_id=media_item.id,
                    status="completed",
                    logged_at=now_dt,
                    completed_at=completed_dt
                )
                session.add(user_log)
            else:
                existing_log.completed_at = completed_dt
                existing_log.status = "completed"
                session.add(existing_log)

            records_processed += 1

        session.commit()
        sync_job.status = "success"
        sync_job.records_processed = records_processed
        
        # Repair any existing concert logs in DB to use parsed event dates
        repair_concert_log_dates(session)
        await enrich_concert_band_images(session)
    except Exception as e:
        session.rollback()
        logger.error(f"Setlist.fm sync failed: {e}", exc_info=True)
        sync_job.status = "failed"
        sync_job.error_message = str(e)

    session.add(sync_job)
    session.commit()
    session.refresh(sync_job)
    return sync_job

async def enrich_concert_band_images(session: Session) -> int:
    """Enrich existing concert entries in the DB with TheAudioDB band images."""
    media_items = session.exec(select(MediaItem).where(MediaItem.media_type == "concert")).all()
    enriched = 0
    for media_item in media_items:
        meta = dict(media_item.metadata_json or {})
        if not meta.get("cover_url"):
            artist_name = meta.get("artist") or (meta.get("raw", {}).get("artist", {}).get("name") if isinstance(meta.get("raw"), dict) else None)
            if artist_name:
                img_url = await fetch_theaudiodb_band_image(artist_name)
                if img_url:
                    meta["cover_url"] = img_url
                    meta["poster_url"] = img_url
                    media_item.metadata_json = meta
                    session.add(media_item)
                    enriched += 1
    if enriched > 0:
        session.commit()
        logger.info(f"Enriched {enriched} concert items with band images from TheAudioDB.")
    return enriched

