import { Injectable, inject, signal, computed } from '@angular/core';
import { PdsAuthService } from './pds-auth.service';
import { DirectMetadataService, EnrichedMetadata } from './direct-metadata.service';

export interface PdsMediaItem {
  id: string; // e.g. "isbn:978...", "tmdb:123", "setlist:456"
  mediaType: string; // "book", "movie", "concert"
  title: string;
  metadataJson?: Record<string, any>;
  createdAt?: string;
  atUri?: string;
  rkey?: string;
}

export interface PdsUserLog {
  id: string; // rkey
  atUri: string;
  atCid?: string;
  mediaItemId: string;
  status: string; // "want_to_consume", "consuming", "completed"
  rating?: number;
  review?: string;
  loggedAt: string;
  completedAt?: string;
  source?: string;
  mediaItem?: PdsMediaItem;
}

const CACHE_LOGS_KEY = 'trackstar_cached_logs';
const CACHE_MEDIA_KEY = 'trackstar_cached_media';

function makeRkeySafe(text: string): string {
  return text.replace(/[^a-zA-Z0-9.\-_~]/g, '_').slice(0, 512);
}

function generateTid(): string {
  // Generates AT Protocol timestamp identifier (TID)
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `3${now.toString(36)}${rand}`;
}

@Injectable({
  providedIn: 'root'
})
export class PdsRepositoryService {
  private auth = inject(PdsAuthService);
  private metadataService = inject(DirectMetadataService);

  // State Signals
  readonly logs = signal<PdsUserLog[]>(this.loadCachedLogs());
  readonly mediaItems = signal<Map<string, PdsMediaItem>>(this.loadCachedMedia());
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.syncFromPds();
    }
  }

  private loadCachedLogs(): PdsUserLog[] {
    try {
      const raw = localStorage.getItem(CACHE_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private loadCachedMedia(): Map<string, PdsMediaItem> {
    try {
      const raw = localStorage.getItem(CACHE_MEDIA_KEY);
      if (raw) {
        const arr: [string, PdsMediaItem][] = JSON.parse(raw);
        return new Map(arr);
      }
    } catch {}
    return new Map();
  }

  private persistCache(): void {
    try {
      localStorage.setItem(CACHE_LOGS_KEY, JSON.stringify(this.logs()));
      const mediaEntries = Array.from(this.mediaItems().entries());
      localStorage.setItem(CACHE_MEDIA_KEY, JSON.stringify(mediaEntries));
    } catch (e) {
      console.warn('Could not save cache to localStorage:', e);
    }
  }

  async syncFromPds(): Promise<void> {
    const session = this.auth.session();
    if (!session) return;

    this.loading.set(true);
    this.error.set(null);

    const agent = this.auth.getAgent();
    const repo = session.did;

    try {
      // 1. Fetch all app.trackstar.media records
      const mediaMap = new Map<string, PdsMediaItem>();
      let mediaCursor: string | undefined = undefined;

      do {
        const res = await agent.com.atproto.repo.listRecords({
          collection: 'app.trackstar.media',
          repo: repo,
          limit: 100,
          cursor: mediaCursor
        });

        for (const rec of res.data.records) {
          const val = rec.value as any;
          const rkey = rec.uri.split('/').pop() || '';
          const item: PdsMediaItem = {
            id: val.id || rkey,
            mediaType: val.mediaType || 'book',
            title: val.title || 'Untitled',
            metadataJson: val.metadataJson || val,
            createdAt: val.createdAt,
            atUri: rec.uri,
            rkey: rkey
          };
          mediaMap.set(item.id, item);
        }
        mediaCursor = res.data.cursor;
      } while (mediaCursor);

      // 2. Fetch all app.trackstar.log records
      const loadedLogs: PdsUserLog[] = [];
      let logCursor: string | undefined = undefined;

      do {
        const res = await agent.com.atproto.repo.listRecords({
          collection: 'app.trackstar.log',
          repo: repo,
          limit: 100,
          cursor: logCursor
        });

        for (const rec of res.data.records) {
          const val = rec.value as any;
          const rkey = rec.uri.split('/').pop() || '';
          const mediaItemId = val.mediaItemId || '';
          
          let mediaItem = mediaMap.get(mediaItemId);
          if (!mediaItem) {
            // Infer basic details from ID if not present in media catalog
            let mType = 'book';
            let mTitle = mediaItemId;
            if (mediaItemId.includes(':')) {
              const [prefix, rawTitle] = mediaItemId.split(':', 2);
              if (['book', 'movie', 'concert'].includes(prefix)) {
                mType = prefix;
                mTitle = rawTitle.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              } else if (prefix === 'isbn') {
                mType = 'book';
                mTitle = `Book (${rawTitle})`;
              } else if (prefix === 'tmdb') {
                mType = 'movie';
                mTitle = `Movie (${rawTitle})`;
              } else if (prefix === 'setlist') {
                mType = 'concert';
                mTitle = `Concert (${rawTitle})`;
              }
            }
            mediaItem = {
              id: mediaItemId,
              mediaType: mType,
              title: mTitle,
              metadataJson: {}
            };
          }

          const log: PdsUserLog = {
            id: rkey,
            atUri: rec.uri,
            atCid: rec.cid,
            mediaItemId: mediaItemId,
            status: val.status || 'completed',
            rating: val.rating,
            review: val.review,
            loggedAt: val.loggedAt || new Date().toISOString(),
            completedAt: val.completedAt,
            source: val.source || mediaItem.metadataJson?.['source'],
            mediaItem: mediaItem
          };
          loadedLogs.push(log);
        }
        logCursor = res.data.cursor;
      } while (logCursor);

      // Sort logs descending by completedAt/loggedAt
      loadedLogs.sort((a, b) => {
        const dateA = new Date(a.completedAt || a.loggedAt).getTime();
        const dateB = new Date(b.completedAt || b.loggedAt).getTime();
        return dateB - dateA;
      });

      this.mediaItems.set(mediaMap);
      this.logs.set(loadedLogs);
      this.persistCache();

      // 3. Trigger background lazy enrichment for items missing posters
      this.enrichMissingMetadata();

    } catch (err: any) {
      console.error('Failed to sync from PDS:', err);
      this.error.set(err?.message || 'Failed to sync with PDS');
    } finally {
      this.loading.set(false);
    }
  }

  async enrichMissingMetadata(): Promise<void> {
    const currentLogs = this.logs();
    const mediaMap = new Map(this.mediaItems());
    let hasUpdates = false;

    for (let i = 0; i < currentLogs.length; i++) {
      const log = currentLogs[i];
      const mItem = log.mediaItem;
      if (!mItem) continue;

      const meta = mItem.metadataJson || {};
      const hasCover = meta['coverUrl'] || meta['cover_url'] || meta['poster_url'] || meta['posterUrl'];

      // If missing cover, resolve it in background
      if (!hasCover) {
        try {
          const enriched = await this.metadataService.resolveMetadata(mItem.mediaType, mItem.title, mItem.id || log.mediaItemId);
          if (enriched && enriched.coverUrl) {
            const updatedMeta = { ...meta, ...enriched };
            mItem.metadataJson = updatedMeta;
            if (enriched.creator && (!meta['creator'] && !meta['author'] && !meta['artist'])) {
              mItem.metadataJson['creator'] = enriched.creator;
            }
            if (enriched.year && !meta['year']) {
              mItem.metadataJson['year'] = enriched.year;
            }
            mediaMap.set(mItem.id, mItem);
            hasUpdates = true;
          }
        } catch (enrichErr) {
          // silently continue
        }
      }
    }

    if (hasUpdates) {
      this.mediaItems.set(mediaMap);
      this.logs.set([...currentLogs]);
      this.persistCache();
    }
  }

  async createLog(payload: {
    mediaType: string;
    title: string;
    status: string;
    rating?: number;
    review?: string;
    mediaItemId?: string;
    completedAt?: string;
    loggedAt?: string;
    source?: string;
    metadataJson?: Record<string, any>;
  }): Promise<PdsUserLog> {
    const session = this.auth.session();
    if (!session) throw new Error('You must be logged into your PDS to save records.');

    const agent = this.auth.getAgent();
    const repo = session.did;

    // 1. Resolve / Enrich metadata if not provided
    let metadata = payload.metadataJson || {};
    if (payload.source) {
      metadata['source'] = payload.source;
    }
    if (!metadata['coverUrl'] && !metadata['cover_url'] && !metadata['poster_url']) {
      const enriched = await this.metadataService.resolveMetadata(payload.mediaType, payload.title, payload.mediaItemId);
      metadata = { ...metadata, ...enriched };
    }

    // 2. Prepare Media Item record
    const mediaId = payload.mediaItemId || `${payload.mediaType}:${payload.title.toLowerCase().replace(/\s+/g, '_')}`;
    const mediaRkey = makeRkeySafe(mediaId);

    const mediaRecord = {
      $type: 'app.trackstar.media',
      id: mediaId,
      mediaType: payload.mediaType,
      title: payload.title,
      metadataJson: metadata,
      createdAt: new Date().toISOString()
    };

    // Put Media record directly into PDS
    await agent.com.atproto.repo.putRecord({
      collection: 'app.trackstar.media',
      repo: repo,
      rkey: mediaRkey,
      record: mediaRecord
    });

    const savedMediaItem: PdsMediaItem = {
      id: mediaId,
      mediaType: payload.mediaType,
      title: payload.title,
      metadataJson: metadata,
      createdAt: mediaRecord.createdAt,
      atUri: `at://${repo}/app.trackstar.media/${mediaRkey}`,
      rkey: mediaRkey
    };

    // 3. Prepare User Log record
    const logRkey = generateTid();
    const loggedAt = payload.loggedAt || new Date().toISOString();

    const logRecord: Record<string, any> = {
      $type: 'app.trackstar.log',
      mediaItemId: mediaId,
      status: payload.status,
      loggedAt: loggedAt,
      source: payload.source || 'trackstar'
    };

    if (payload.rating !== undefined) {
      logRecord['rating'] = payload.rating;
    }
    if (payload.review) {
      logRecord['review'] = payload.review;
    }
    if (payload.completedAt) {
      logRecord['completedAt'] = payload.completedAt;
    }

    // Put User Log record directly into PDS
    const logRes = await agent.com.atproto.repo.putRecord({
      collection: 'app.trackstar.log',
      repo: repo,
      rkey: logRkey,
      record: logRecord
    });

    const newLog: PdsUserLog = {
      id: logRkey,
      atUri: logRes.data.uri,
      atCid: logRes.data.cid,
      mediaItemId: mediaId,
      status: payload.status,
      rating: payload.rating,
      review: payload.review,
      loggedAt: loggedAt,
      completedAt: payload.completedAt,
      mediaItem: savedMediaItem
    };

    // 4. Update reactive state signals
    const currentMedia = new Map(this.mediaItems());
    currentMedia.set(mediaId, savedMediaItem);
    this.mediaItems.set(currentMedia);

    this.logs.update(logs => [newLog, ...logs]);
    this.persistCache();

    return newLog;
  }

  async deleteLog(log: PdsUserLog): Promise<void> {
    const session = this.auth.session();
    if (!session) throw new Error('You must be logged into your PDS to delete records.');

    const agent = this.auth.getAgent();
    const repo = session.did;

    await agent.com.atproto.repo.deleteRecord({
      collection: 'app.trackstar.log',
      repo: repo,
      rkey: log.id
    });

    // Remove from in-memory signals
    this.logs.update(logs => logs.filter(l => l.id !== log.id));
    this.persistCache();
  }

  getFilteredLogs(status?: string, type?: string, query?: string): PdsUserLog[] {
    let result = this.logs();

    if (status) {
      result = result.filter(l => l.status === status);
    }
    if (type) {
      result = result.filter(l => l.mediaItem?.mediaType === type);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(l => 
        (l.mediaItem?.title || '').toLowerCase().includes(q) ||
        (l.review || '').toLowerCase().includes(q)
      );
    }
    return result;
  }

  getStats(excludeStatus?: string, onlyStatus?: string): Record<string, number> {
    const counts: Record<string, number> = { book: 0, movie: 0, concert: 0 };
    for (const log of this.logs()) {
      if (excludeStatus && log.status === excludeStatus) continue;
      if (onlyStatus && log.status !== onlyStatus) continue;

      const type = log.mediaItem?.mediaType || 'book';
      if (type in counts) {
        counts[type]++;
      }
    }
    return counts;
  }
}
