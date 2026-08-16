// Trackstar Chrome Extension - Background Service Worker (PDS Architecture)

const DEFAULT_PDS_CONFIG = {
  pdsUrl: 'http://localhost:3000',
  handle: 'kentrain.trackstar.test',
  password: 'password123',
  accessJwt: '',
  did: ''
};

// Initialize default storage on install & purge legacy local sync ledger
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('pdsConfig');
  if (!data.pdsConfig) {
    await chrome.storage.local.set({ pdsConfig: DEFAULT_PDS_CONFIG });
  }
  // Remove legacy local sync cache so PDS is 100% the single source of truth
  await chrome.storage.local.remove('syncedEntries');
  console.log('[Trackstar Extension] Service worker initialized in Stateless PDS Mode.');
});

// Helper: Make XRPC Request to PDS
async function makeXrpcRequest(endpoint, method = 'GET', body = null, token = null) {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  const baseUrl = (pdsConfig?.pdsUrl || 'http://localhost:3000').replace(/\/$/, '');
  const url = `${baseUrl}/xrpc/${endpoint}`;

  const headers = { 'Content-Type': 'application/json' };
  const authHeader = token || pdsConfig?.accessJwt;
  if (authHeader) {
    headers['Authorization'] = `Bearer ${authHeader}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `XRPC Error ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

// Handler: Login to PDS
async function loginPds(pdsUrl, handle, password) {
  const cleanUrl = pdsUrl.replace(/\/$/, '');
  const res = await fetch(`${cleanUrl}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle.trim(), password: password.trim() })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Invalid PDS credentials.');
  }

  const session = await res.json();
  const config = {
    pdsUrl: cleanUrl,
    handle: session.handle || handle,
    password: password,
    accessJwt: session.accessJwt,
    did: session.did
  };

  await chrome.storage.local.set({ pdsConfig: config });
  return config;
}

// Helper: List all records in a collection with pagination support
async function listAllCollectionRecords(did, collection) {
  let allRecords = [];
  let cursor = null;
  do {
    const url = `com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const res = await makeXrpcRequest(url, 'GET');
    const records = res.records || [];
    allRecords = allRecords.concat(records);
    cursor = res.cursor;
    if (records.length === 0) break;
  } while (cursor);
  return allRecords;
}

// Handler: Fetch all media logs across all media types (movies, books, concerts, etc.)
// 100% PDS-Driven: Sync status is derived directly from PDS record fields
async function fetchAllMediaLogs() {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  if (!pdsConfig?.did) {
    throw new Error('Not connected to PDS. Please log in.');
  }

  const mediaRecords = await listAllCollectionRecords(pdsConfig.did, 'app.trackstar.media');
  const mediaMap = {};
  mediaRecords.forEach(r => {
    const val = r.value || {};
    const id = val.id || r.uri.split('/').pop();
    mediaMap[id] = { uri: r.uri, ...val };
  });

  const logRecords = await listAllCollectionRecords(pdsConfig.did, 'app.trackstar.log');

  const items = [];
  logRecords.forEach(r => {
    const val = r.value || {};
    const rkey = r.uri.split('/').pop();
    const mediaId = val.mediaItemId || '';
    const media = mediaMap[mediaId] || {};

    let metadata = media.metadataJson || {};
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = {};
      }
    }

    let mediaType = (media.mediaType || '').toLowerCase();
    if (!mediaType) {
      if (mediaId.startsWith('tmdb:') || mediaId.startsWith('movie:')) mediaType = 'movie';
      else if (mediaId.startsWith('isbn:') || mediaId.startsWith('book:')) mediaType = 'book';
      else if (mediaId.startsWith('setlist:') || mediaId.startsWith('concert:')) mediaType = 'concert';
      else mediaType = 'other';
    }

    // Determine source strictly from PDS record
    const rawSource = (val.source || metadata.source || '').toLowerCase();
    let source = rawSource || 'trackstar';
    let isOriginal = false;
    let isSynced = false;

    if (mediaType === 'movie') {
      isOriginal = (
        rawSource === 'letterboxd' ||
        rawSource === 'letterboxd_1click_export' ||
        rawSource === 'letterboxd_rss' ||
        rkey.startsWith('lb_') ||
        Boolean(metadata.letterboxd_url) ||
        Boolean(val.letterboxd_url)
      );
      source = isOriginal ? 'letterboxd' : (rawSource || 'trackstar');
      isSynced = isOriginal;
    } else if (mediaType === 'book') {
      isOriginal = (
        rawSource === 'storygraph' ||
        rawSource === 'goodreads' ||
        rkey.startsWith('sg_') ||
        Boolean(metadata.storygraph_url) ||
        Boolean(val.storygraph_url)
      );
      source = isOriginal ? 'storygraph' : (rawSource || 'trackstar');
      isSynced = isOriginal;
    } else if (mediaType === 'concert') {
      isOriginal = (
        rawSource === 'setlist.fm' ||
        rawSource === 'setlist' ||
        rkey.startsWith('setlist_') ||
        mediaId.startsWith('setlist:') ||
        Boolean(metadata.setlist_url) ||
        Boolean(val.setlist_url)
      );
      source = isOriginal ? 'setlist.fm' : (rawSource || 'trackstar');
      isSynced = isOriginal;
    } else {
      isOriginal = Boolean(rawSource && rawSource !== 'trackstar');
      source = rawSource || 'trackstar';
      isSynced = isOriginal;
    }

    const coverUrl = metadata.coverUrl || metadata.poster_url || metadata.artist_image || '';
    const title = media.title || mediaId.replace(/^[^:]+:/, '').replace(/_/g, ' ');
    const author = metadata.author || metadata.creator || metadata.artist || '';
    const venue = metadata.venue || '';
    const city = metadata.city || '';
    const year = metadata.year || media.year || (metadata.eventDate ? metadata.eventDate.split('-')[0] : '');

    items.push({
      rkey: rkey,
      atUri: r.uri,
      mediaItemId: mediaId,
      mediaType: mediaType,
      title: title,
      author: author,
      venue: venue,
      city: city,
      year: year,
      letterboxdUrl: metadata.letterboxd_url || '',
      coverUrl: coverUrl,
      status: val.status || 'completed',
      rating: val.rating || null,
      review: val.review || '',
      completedAt: val.completedAt || val.loggedAt || '',
      loggedAt: val.loggedAt || '',
      source: source,
      isOriginal: isOriginal,
      isSynced: isSynced
    });
  });

  items.sort((a, b) => new Date(b.completedAt || b.loggedAt || 0) - new Date(a.completedAt || a.loggedAt || 0));
  return items;
}

// Handler: Fetch all movie logs from PDS (for Letterboxd outbound sync)
async function fetchMovieLogs() {
  const allItems = await fetchAllMediaLogs();
  return allItems.filter(i => i.mediaType === 'movie');
}

// Handler: Fetch unsynced books from PDS (for StoryGraph Goodreads-format outbound sync)
async function fetchBooksFromPds() {
  const allItems = await fetchAllMediaLogs();
  return allItems.filter(i => i.mediaType === 'book');
}

// Handler: Launch Assisted Letterboxd Outbound Sync
async function launchLetterboxdSync(movie) {
  let slug = '';
  if (movie.letterboxdUrl && movie.letterboxdUrl.includes('letterboxd.com/film/')) {
    const match = movie.letterboxdUrl.match(/letterboxd\.com\/film\/([^\/]+)/);
    if (match) slug = match[1];
  }
  if (!slug) {
    slug = (movie.title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const targetUrl = `https://letterboxd.com/film/${slug}/review/`;

  const payload = {
    rkey: movie.rkey,
    atUri: movie.atUri,
    title: movie.title,
    year: movie.year,
    rating: movie.rating,
    rating10: movie.rating ? movie.rating * 2 : null,
    review: movie.review || '',
    watchedDate: movie.completedAt ? movie.completedAt.split('T')[0] : (movie.loggedAt ? movie.loggedAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    tags: 'trackstar',
    action: 'log_movie'
  };

  const payloadEncoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
  const fullUrl = `${targetUrl}#trackstar-sync=${payloadEncoded}`;

  const tab = await chrome.tabs.create({ url: fullUrl, active: true });
  return { success: true, tabId: tab.id };
}

// Helper: Sanitize string for rkey/id
function sanitizeKey(str) {
  return (str || 'untitled')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
}

// Handler: Batch Ingest Records into PDS (Supports both Movies & Books with Deduplication)
async function handleBatchIngestPds(records) {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  if (!pdsConfig?.did || !pdsConfig?.accessJwt) {
    throw new Error('Not logged in to PDS. Please configure PDS in the extension popup.');
  }

  let totalProcessed = 0;
  const errors = [];
  const CHUNK_SIZE = 5;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (item) => {
      try {
        const mediaType = item.mediaType || (item.author || item.isbn ? 'book' : 'movie');
        const title = (item.title || 'Untitled').trim();
        const titleKey = sanitizeKey(title);
        const source = item.source || (mediaType === 'book' ? 'storygraph' : 'letterboxd');

        let mediaKey = '';
        let mediaId = '';
        let mediaRecord = {};
        let logRkey = '';

        if (mediaType === 'book') {
          // BOOK (StoryGraph)
          const author = (item.author || item.creator || '').trim();
          const authorKey = sanitizeKey(author);
          const isbn = (item.isbn || '').replace(/[^0-9X]/gi, '');

          mediaKey = isbn ? `book_isbn_${isbn}` : `book_${titleKey}${authorKey ? '_' + authorKey : ''}`;
          mediaId = isbn ? `isbn:${isbn}` : `book:${titleKey}${authorKey ? '_' + authorKey : ''}`;

          let coverUrl = item.coverUrl;
          if (!coverUrl && isbn) {
            coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
          }

          mediaRecord = {
            $type: 'app.trackstar.media',
            id: mediaId,
            mediaType: 'book',
            title: title,
            metadataJson: {
              author: author,
              creator: author,
              isbn: isbn || undefined,
              coverUrl: coverUrl,
              source: source
            },
            createdAt: new Date().toISOString()
          };

          // Deterministic Log Rkey for Books
          const dateKey = (item.completedDate || item.date || '').replace(/[^0-9]/g, '') || 'nodate';
          if (item.status === 'want_to_consume' || item.status === 'to-read') {
            logRkey = `sg_tbr_${titleKey}`.slice(0, 64);
          } else if (item.status === 'consuming' || item.status === 'currently-reading') {
            logRkey = `sg_cur_${titleKey}`.slice(0, 64);
          } else {
            logRkey = `sg_read_${titleKey}_${dateKey}`.slice(0, 64);
          }

        } else if (mediaType === 'concert') {
          // CONCERT (setlist.fm)
          const artist = (item.artist || item.creator || item.author || '').trim();
          const venue = (item.venue || '').trim();
          const rawDate = item.completedDate || item.date || item.watchedDate || '';
          const setlistId = item.id || sanitizeKey(`${title}_${rawDate}`);

          mediaKey = sanitizeKey(`setlist_${setlistId}`);
          mediaId = `setlist:${setlistId}`;

          mediaRecord = {
            $type: 'app.trackstar.media',
            id: mediaId,
            mediaType: 'concert',
            title: title,
            metadataJson: {
              artist: artist,
              venue: venue,
              city: item.city || '',
              country: item.country || '',
              setlist_url: item.setlistUrl || item.setlist_url || '',
              eventDate: rawDate,
              source: source
            },
            createdAt: new Date().toISOString()
          };

          logRkey = sanitizeKey(`setlist_log_${setlistId}`);

        } else {
          // MOVIE (Letterboxd)
          const year = item.year ? String(item.year).trim() : '';
          const yearKey = year ? sanitizeKey(year) : 'na';
          const coverUrl = item.coverUrl || item.poster_url || item.image_url || undefined;

          mediaKey = `movie_${titleKey}${year ? '_' + yearKey : ''}`;
          mediaId = `movie:${titleKey}${year ? '_' + yearKey : ''}`;

          mediaRecord = {
            $type: 'app.trackstar.media',
            id: mediaId,
            mediaType: 'movie',
            title: title,
            metadataJson: {
              year: year ? parseInt(year, 10) : undefined,
              letterboxd_url: item.letterboxdUrl || '',
              coverUrl: coverUrl,
              poster_url: coverUrl,
              tags: item.tags || [],
              source: source
            },
            createdAt: new Date().toISOString()
          };

          const dateKey = (item.watchedDate || item.date || '').replace(/[^0-9]/g, '') || 'nodate';
          if (item.status === 'want_to_consume') {
            logRkey = `lb_wl_${titleKey}_${yearKey}`.slice(0, 64);
          } else {
            logRkey = `lb_log_${titleKey}_${yearKey}_${dateKey}`.slice(0, 64);
          }
        }

        // 1. Put Media Record (Idempotent)
        await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
          repo: pdsConfig.did,
          collection: 'app.trackstar.media',
          rkey: mediaKey,
          record: mediaRecord
        });

        // 2. Put Log Record (Idempotent)
        let completedIso = undefined;
        const rawDate = item.completedDate || item.watchedDate || item.date;
        if (rawDate) {
          try {
            completedIso = new Date(rawDate).toISOString();
          } catch {
            completedIso = new Date().toISOString();
          }
        }

        let loggedIso = new Date().toISOString();
        if (item.date) {
          try {
            loggedIso = new Date(item.date).toISOString();
          } catch {}
        }

        await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
          repo: pdsConfig.did,
          collection: 'app.trackstar.log',
          rkey: logRkey,
          record: {
            $type: 'app.trackstar.log',
            mediaItemId: mediaId,
            status: item.status === 'to-read' ? 'want_to_consume' : (item.status === 'currently-reading' ? 'consuming' : (item.status || 'completed')),
            rating: item.rating ? Number(item.rating) : undefined,
            review: item.review ? String(item.review).trim() : undefined,
            completedAt: completedIso,
            loggedAt: loggedIso,
            source: source
          }
        });

        totalProcessed++;
      } catch (err) {
        console.warn(`[Trackstar Batch Ingest] Error on item "${item.title}":`, err);
        errors.push({ title: item.title, error: err.message });
      }
    }));
  }

  return { success: true, count: totalProcessed, total: records.length, errors };
}

// Handler: Mark books as synced to StoryGraph & update source on PDS
async function markBooksSynced(books) {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  if (!pdsConfig?.did) {
    throw new Error('Not logged in to PDS.');
  }

  let count = 0;
  for (const b of books) {
    if (b.rkey) {
      try {
        const getRes = await makeXrpcRequest(
          `com.atproto.repo.getRecord?repo=${encodeURIComponent(pdsConfig.did)}&collection=app.trackstar.log&rkey=${b.rkey}`,
          'GET'
        );
        if (getRes && getRes.value) {
          const updatedRecord = {
            ...getRes.value,
            source: 'storygraph'
          };
          await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
            repo: pdsConfig.did,
            collection: 'app.trackstar.log',
            rkey: b.rkey,
            record: updatedRecord
          });
          count++;
        }
      } catch (e) {
        console.warn('Update PDS log source notice:', e);
      }
    }
  }

  return { success: true, count };
}

// Handler: Mark movies as synced to Letterboxd & update source on PDS
async function markMoviesSynced(movies) {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  if (!pdsConfig?.did) {
    throw new Error('Not logged in to PDS.');
  }

  let count = 0;
  for (const m of movies) {
    if (m.rkey) {
      try {
        const getRes = await makeXrpcRequest(
          `com.atproto.repo.getRecord?repo=${encodeURIComponent(pdsConfig.did)}&collection=app.trackstar.log&rkey=${m.rkey}`,
          'GET'
        );
        if (getRes && getRes.value) {
          const updatedRecord = {
            ...getRes.value,
            source: 'letterboxd'
          };
          await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
            repo: pdsConfig.did,
            collection: 'app.trackstar.log',
            rkey: m.rkey,
            record: updatedRecord
          });
          count++;
        }
      } catch (e) {
        console.warn('Update PDS movie source notice:', e);
      }
    }
  }

  return { success: true, count };
}

// Handler: Mark item as synced directly on the PDS
async function markItemSyncedOnPds(rkey, source = 'trackstar') {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  if (!pdsConfig?.did || !rkey) {
    throw new Error('Not connected to PDS or missing record key.');
  }

  const getRes = await makeXrpcRequest(
    `com.atproto.repo.getRecord?repo=${encodeURIComponent(pdsConfig.did)}&collection=app.trackstar.log&rkey=${encodeURIComponent(rkey)}`,
    'GET'
  );

  if (getRes && getRes.value) {
    const updatedRecord = {
      ...getRes.value,
      source: source
    };
    await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
      repo: pdsConfig.did,
      collection: 'app.trackstar.log',
      rkey: rkey,
      record: updatedRecord
    });
  }
  return { success: true };
}

// =========================================================================
// LETTERBOXD RSS POLLING — State helpers (replaces Python SQLite sync_state.db)
// Synced Letterboxd entry URLs are persisted in chrome.storage.local under
// the key 'lbRssSynced' as a Set serialized to an array.
// =========================================================================

async function getRssSyncedUrls() {
  const { lbRssSynced } = await chrome.storage.local.get('lbRssSynced');
  return new Set(Array.isArray(lbRssSynced) ? lbRssSynced : []);
}

async function addRssSyncedUrls(urls) {
  const existing = await getRssSyncedUrls();
  urls.forEach(u => existing.add(u));
  await chrome.storage.local.set({ lbRssSynced: Array.from(existing) });
}

// Handler: Ingest pre-parsed RSS records (parsed in popup via DOMParser) and
// return counts of new vs. already-seen entries for UI feedback.
async function handleLetterboxdRssIngest(parsedItems) {
  const synced = await getRssSyncedUrls();

  const newItems = parsedItems.filter(item => item.link && !synced.has(item.link));
  if (newItems.length === 0) {
    return { newCount: 0, totalCount: parsedItems.length, errors: [] };
  }

  // Map to the shape expected by handleBatchIngestPds
  const records = newItems.map(item => ({
    mediaType: 'movie',
    title: item.title,
    status: 'completed',
    rating: item.rating,
    watchedDate: item.watchedDate,
    date: item.watchedDate,
    year: item.year,
    coverUrl: item.coverUrl,
    poster_url: item.coverUrl,
    letterboxdUrl: item.link,
    source: 'letterboxd_rss'
  }));

  const result = await handleBatchIngestPds(records);

  // Persist the newly synced URLs so they are skipped on the next poll
  await addRssSyncedUrls(newItems.map(i => i.link));

  return { newCount: result.count, totalCount: parsedItems.length, errors: result.errors };
}

// Handler: Unmark item synced (reverts source to 'trackstar' on PDS)
async function unmarkItemSyncedOnPds(rkey) {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  if (!pdsConfig?.did || !rkey) {
    throw new Error('Not connected to PDS or missing record key.');
  }

  const getRes = await makeXrpcRequest(
    `com.atproto.repo.getRecord?repo=${encodeURIComponent(pdsConfig.did)}&collection=app.trackstar.log&rkey=${encodeURIComponent(rkey)}`,
    'GET'
  );

  if (getRes && getRes.value) {
    const updatedRecord = {
      ...getRes.value,
      source: 'trackstar'
    };
    await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
      repo: pdsConfig.did,
      collection: 'app.trackstar.log',
      rkey: rkey,
      record: updatedRecord
    });
  }
  return { success: true };
}

// Handler: Synchronize Attended Concerts directly from setlist.fm REST API into PDS
async function handleSetlistFmSync(userId, apiKey) {
  const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
  if (!pdsConfig?.did || !pdsConfig?.accessJwt) {
    throw new Error('Not connected to PDS. Please connect to PDS in the extension first.');
  }

  const cleanUser = (userId || '').trim();
  const cleanKey = (apiKey || '').trim();

  if (!cleanUser) throw new Error('setlist.fm username is required.');
  if (!cleanKey) throw new Error('setlist.fm API key is required.');

  // Persist credentials in extension local storage
  await chrome.storage.local.set({ setlistUsername: cleanUser, setlistApiKey: cleanKey });

  let page = 1;
  let totalConcerts = 0;
  let totalProcessed = 0;
  let totalPages = 1;
  const errors = [];

  while (page <= totalPages) {
    const targetUrl = `https://api.setlist.fm/rest/1.0/user/${encodeURIComponent(cleanUser)}/attended?p=${page}`;
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': cleanKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('setlist.fm returned 403 Forbidden. Please verify your setlist.fm API key and username.');
      }
      if (res.status === 404) {
        throw new Error(`setlist.fm user "${cleanUser}" not found.`);
      }
      const errText = await res.text().catch(() => '');
      throw new Error(`setlist.fm API error (${res.status} ${res.statusText}): ${errText}`);
    }

    const data = await res.json();
    const setlists = data.setlist || [];
    totalConcerts = data.total || setlists.length;
    const itemsPerPage = data.itemsPerPage || 20;
    totalPages = Math.max(1, Math.ceil(totalConcerts / itemsPerPage));

    for (const concert of setlists) {
      try {
        const artist = (concert.artist?.name || 'Unknown Artist').trim();
        const venue = (concert.venue?.name || 'Venue').trim();
        const city = concert.venue?.city?.name || '';
        const state = concert.venue?.city?.state || '';
        const country = concert.venue?.city?.country?.name || '';
        const rawDate = concert.eventDate || ''; // "23-08-2024"
        const url = concert.url || '';
        const setlistId = concert.id || sanitizeKey(`${artist}_${venue}_${rawDate}`);

        let isoDate = undefined;
        let year = undefined;
        if (rawDate && rawDate.includes('-')) {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            isoDate = `${y}-${m}-${d}T00:00:00Z`;
            year = parseInt(y, 10);
          }
        }

        const title = `${artist} @ ${venue}`;
        const mediaId = `setlist:${setlistId}`;
        const mediaKey = sanitizeKey(`setlist_${setlistId}`);
        const logRkey = sanitizeKey(`setlist_log_${setlistId}`);

        const metadata = {
          artist: artist,
          venue: venue,
          city: city,
          state: state,
          country: country,
          setlist_url: url,
          eventDate: rawDate,
          year: year,
          source: 'setlist.fm'
        };

        // 1. Put Media Record (Idempotent)
        await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
          repo: pdsConfig.did,
          collection: 'app.trackstar.media',
          rkey: mediaKey,
          record: {
            $type: 'app.trackstar.media',
            id: mediaId,
            mediaType: 'concert',
            title: title,
            metadataJson: metadata,
            createdAt: new Date().toISOString()
          }
        });

        // 2. Put Log Record (Idempotent)
        await makeXrpcRequest('com.atproto.repo.putRecord', 'POST', {
          repo: pdsConfig.did,
          collection: 'app.trackstar.log',
          rkey: logRkey,
          record: {
            $type: 'app.trackstar.log',
            mediaItemId: mediaId,
            status: 'completed',
            completedAt: isoDate || new Date().toISOString(),
            loggedAt: new Date().toISOString(),
            source: 'setlist.fm'
          }
        });

        totalProcessed++;
      } catch (itemErr) {
        console.warn('[Trackstar Setlist Sync] Error processing concert item:', itemErr);
        errors.push({ id: concert.id, error: itemErr.message });
      }
    }

    page++;
    if (page <= totalPages) {
      await new Promise(r => setTimeout(r, 600)); // Respect setlist.fm rate limits
    }
  }

  return { success: true, count: totalProcessed, total: totalConcerts, errors };
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case 'LOGIN_PDS':
        return await loginPds(message.pdsUrl, message.handle, message.password);
      case 'GET_CONFIG': {
        const { pdsConfig } = await chrome.storage.local.get('pdsConfig');
        return pdsConfig || DEFAULT_PDS_CONFIG;
      }
      case 'FETCH_ALL_MEDIA':
        return await fetchAllMediaLogs();
      case 'FETCH_MOVIES':
        return await fetchMovieLogs();
      case 'FETCH_BOOKS':
        return await fetchBooksFromPds();
      case 'INITIATE_SYNC':
        return await launchLetterboxdSync(message.movie);
      case 'MARK_SYNCED':
        return await markItemSyncedOnPds(message.rkey, message.source || 'trackstar');
      case 'UNMARK_SYNCED':
        return await unmarkItemSyncedOnPds(message.rkey);
      case 'MARK_BOOKS_SYNCED':
        return await markBooksSynced(message.books);
      case 'MARK_MOVIES_SYNCED':
        return await markMoviesSynced(message.movies);
      case 'FETCH_EXTERNAL_URL': {
        const headers = message.headers || {};
        const res = await fetch(message.url, { headers });
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`External fetch error (${res.status} ${res.statusText}): ${errBody}`);
        }
        const text = await res.text();
        return text;
      }
      case 'BATCH_INGEST_PDS':
        return await handleBatchIngestPds(message.records);
      case 'LETTERBOXD_RSS_INGEST':
        return await handleLetterboxdRssIngest(message.items);
      case 'GET_RSS_SYNCED_URLS':
        return Array.from(await getRssSyncedUrls());
      case 'CLEAR_RSS_SYNCED_URLS':
        await chrome.storage.local.remove('lbRssSynced');
        return { success: true };
      case 'SETLIST_FM_SYNC':
        return await handleSetlistFmSync(message.username, message.apiKey);
      case 'GET_SETLIST_CREDENTIALS': {
        const data = await chrome.storage.local.get(['setlistUsername', 'setlistApiKey']);
        return { username: data.setlistUsername || '', apiKey: data.setlistApiKey || '' };
      }
      case 'SAVE_SETLIST_CREDENTIALS':
        await chrome.storage.local.set({
          setlistUsername: (message.username || '').trim(),
          setlistApiKey: (message.apiKey || '').trim()
        });
        return { success: true };
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  };

  handle()
    .then(res => sendResponse({ success: true, data: res }))
    .catch(err => sendResponse({ success: false, error: err.message }));

  return true; // Keep channel open for async response
});
