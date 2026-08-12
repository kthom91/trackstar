import asyncio
import logging
from typing import Optional, Dict, Any, List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

async def fetch_open_library_metadata(isbn: str) -> Dict[str, Any]:
    """Fetch book metadata from Open Library REST API using ISBN."""
    clean_isbn = isbn.replace("-", "").strip()
    if not clean_isbn:
        return {}
    
    url = f"https://openlibrary.org/isbn/{clean_isbn}.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, follow_redirects=True)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "title": data.get("title"),
                    "isbn": clean_isbn,
                    "publish_date": data.get("publish_date"),
                    "publishers": data.get("publishers", []),
                    "number_of_pages": data.get("number_of_pages"),
                    "cover_url": f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-L.jpg",
                    "raw": data
                }
    except Exception as e:
        logger.warning(f"Error fetching Open Library metadata for ISBN {clean_isbn}: {e}")
    return {}

async def fetch_tmdb_metadata(title: str, year: Optional[int] = None, tmdb_id: Optional[str] = None) -> Dict[str, Any]:
    """Fetch movie metadata from TMDB API."""
    if not settings.TMDB_API_KEY:
        return {}
    
    headers = {"Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if tmdb_id:
                url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={settings.TMDB_API_KEY}"
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    poster_path = data.get("poster_path")
                    return {
                        "tmdb_id": data.get("id"),
                        "title": data.get("title"),
                        "overview": data.get("overview"),
                        "release_date": data.get("release_date"),
                        "vote_average": data.get("vote_average"),
                        "poster_url": f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None,
                        "raw": data
                    }
            
            # Fallback search by title/year
            params = {"api_key": settings.TMDB_API_KEY, "query": title}
            if year:
                params["year"] = str(year)
            
            url = "https://api.themoviedb.org/3/search/movie"
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    best_match = results[0]
                    poster_path = best_match.get("poster_path")
                    return {
                        "tmdb_id": best_match.get("id"),
                        "title": best_match.get("title"),
                        "overview": best_match.get("overview"),
                        "release_date": best_match.get("release_date"),
                        "vote_average": best_match.get("vote_average"),
                        "poster_url": f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None,
                        "raw": best_match
                    }
    except Exception as e:
        logger.warning(f"Error fetching TMDB metadata for title '{title}': {e}")
    return {}

async def fetch_setlist_fm_attended(user_id: str, api_key: str) -> List[Dict[str, Any]]:
    """Fetch all attended concerts for a user from setlist.fm REST API with rate limiting and retry handling."""
    if not user_id or not api_key:
        logger.info("Setlist.fm user_id or api_key missing; skipping setlist.fm fetch.")
        return []
    
    headers = {
        "x-api-key": api_key,
        "Accept": "application/json"
    }
    
    setlists = []
    page = 1
    total_pages = 1
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        while page <= total_pages:
            url = f"https://api.setlist.fm/rest/1.0/user/{user_id}/attended?p={page}"
            retry_count = 0
            success = False
            
            while retry_count < 5 and not success:
                try:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        page_setlists = data.get("setlist", [])
                        setlists.extend(page_setlists)
                        
                        items_per_page = data.get("itemsPerPage", 20)
                        total = data.get("total", 0)
                        if items_per_page > 0 and total > 0:
                            total_pages = (total + items_per_page - 1) // items_per_page
                        else:
                            total_pages = 1
                            
                        logger.info(f"setlist.fm page {page}/{total_pages} fetched ({len(page_setlists)} items, total: {total}).")
                        page += 1
                        success = True
                    elif resp.status_code == 429:
                        retry_count += 1
                        wait_time = 2.0 * retry_count
                        logger.warning(f"setlist.fm rate limit 429 on page {page}. Retrying in {wait_time}s (attempt {retry_count}/5)...")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.warning(f"setlist.fm API error on page {page}, status code {resp.status_code}: {resp.text}")
                        # Return accumulated setlists on non-recoverable error
                        return setlists
                except Exception as e:
                    retry_count += 1
                    logger.warning(f"Exception fetching setlist.fm page {page}: {e}. Retrying (attempt {retry_count}/5)...")
                    await asyncio.sleep(2.0)
            
            if not success:
                logger.error(f"Failed to fetch setlist.fm page {page} after retries. Stopping pagination.")
                break
                
            # Respect setlist.fm rate limit (max 2 requests per second -> wait 0.6s between page fetches)
            await asyncio.sleep(0.6)
            
    return setlists

