import { Injectable, inject, signal } from '@angular/core';
import { BskyAgent } from '@atproto/api';
import {
  CreateLogPayload,
  PdsMediaItem,
  PdsUserLog,
  generateTid,
  getSourceDisplayName,
  makeRkeySafe,
  sanitizeAtprotoRecord,
  sanitizeRating
} from '@trackstar/pds';
import { DirectMetadataService } from './direct-metadata.service';
import { ModalService } from './modal.service';
import { PdsAuthService } from './pds-auth.service';

export type { CreateLogPayload, PdsMediaItem, PdsUserLog };

const CACHE_LOGS_KEY = 'trackstar_cached_logs';
const CACHE_MEDIA_KEY = 'trackstar_cached_media';

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
    } catch { }
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

  private modalService = inject(ModalService);

  /**
   * Automatically execute AT Protocol operations with session refresh on 401
   */
  private async executeWithAuth<T>(operation: (agent: BskyAgent, repo: string) => Promise<T>): Promise<T> {
    const session = this.auth.session();
    if (!session) throw new Error('You must be logged into your PDS.');

    try {
      return await operation(this.auth.getAgent(), session.did);
    } catch (err: any) {
      const isAuthErr = err?.status === 401 ||
        err?.message?.includes('AuthenticationRequired') ||
        err?.message?.includes('ExpiredToken') ||
        err?.message?.includes('401') ||
        err?.error === 'AuthMissing' ||
        err?.error === 'ExpiredToken';

      if (isAuthErr) {
        console.warn('[PdsRepo] Received 401 Unauthorized, refreshing session token...');
        const refreshed = await this.auth.refreshSession();
        if (refreshed && this.auth.session()) {
          return await operation(this.auth.getAgent(), this.auth.session()!.did);
        } else {
          console.warn('[PdsRepo] Session expired and cannot be refreshed automatically. Opening PDS login modal.');
          this.auth.logout();
          this.modalService.openPdsModal();
          throw new Error('Your PDS session has expired. Please reconnect your PDS credentials to continue.');
        }
      }
      throw err;
    }
  }

  async syncFromPds(): Promise<void> {
    const session = this.auth.session();
    if (!session) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.executeWithAuth(async (agent, repo) => {
        // Load current cache to preserve any client-side enrichments (e.g. posters)
        const cachedMediaMap = this.loadCachedMedia();

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
            const rawId = val.id || rkey;

            let metadata: Record<string, any> = {};
            if (val.metadataJson) {
              if (typeof val.metadataJson === 'string') {
                try {
                  metadata = JSON.parse(val.metadataJson);
                } catch {
                  metadata = {};
                }
              } else if (typeof val.metadataJson === 'object') {
                metadata = { ...val.metadataJson };
              }
            } else if (typeof val === 'object') {
              metadata = { ...val };
            }

            // Preserve existing cached enrichments (such as coverUrl, poster_url, creator)
            const cached = cachedMediaMap.get(rawId) ||
              cachedMediaMap.get(rkey) ||
              cachedMediaMap.get(makeRkeySafe(rawId)) ||
              (rawId.includes(':') ? cachedMediaMap.get(rawId.replace(/:/g, '_')) : undefined);

            if (cached && cached.metadataJson) {
              const cachedMeta = typeof cached.metadataJson === 'string'
                ? (() => { try { return JSON.parse(cached.metadataJson); } catch { return {}; } })()
                : cached.metadataJson;

              const existingCover = cachedMeta['coverUrl'] || cachedMeta['poster_url'] || cachedMeta['posterUrl'] || cachedMeta['image_url'];
              const currentCover = metadata['coverUrl'] || metadata['poster_url'] || metadata['posterUrl'] || metadata['image_url'];

              if (existingCover && !currentCover) {
                metadata['coverUrl'] = existingCover;
                metadata['poster_url'] = existingCover;
              }
              if (cachedMeta['creator'] && !metadata['creator']) {
                metadata['creator'] = cachedMeta['creator'];
              }
              if (cachedMeta['year'] && !metadata['year']) {
                metadata['year'] = cachedMeta['year'];
              }
            }

            const item: PdsMediaItem = {
              id: rawId,
              mediaType: val.mediaType || 'book',
              title: val.title || 'Untitled',
              metadataJson: metadata,
              createdAt: val.createdAt,
              atUri: rec.uri,
              rkey: rkey
            };

            // Map all possible variations of the ID/key so lookups never fail
            mediaMap.set(item.id, item);
            mediaMap.set(rkey, item);
            mediaMap.set(makeRkeySafe(item.id), item);
            if (item.id.includes(':')) {
              mediaMap.set(item.id.replace(/:/g, '_'), item);
            }
            if (rkey.includes('_')) {
              mediaMap.set(rkey.replace(/_/g, ':'), item);
            }
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

            let mediaItem = mediaMap.get(mediaItemId) ||
              mediaMap.get(makeRkeySafe(mediaItemId)) ||
              (mediaItemId.includes(':') ? mediaMap.get(mediaItemId.replace(/:/g, '_')) : undefined) ||
              (mediaItemId.includes('_') ? mediaMap.get(mediaItemId.replace(/_/g, ':')) : undefined);

            if (!mediaItem) {
              // Try finding in cache
              const cached = cachedMediaMap.get(mediaItemId) || cachedMediaMap.get(makeRkeySafe(mediaItemId));
              if (cached) {
                mediaItem = cached;
                mediaMap.set(mediaItemId, cached);
              }
            }

            if (!mediaItem) {
              // Infer basic details from ID if not present in media catalog
              let mType = 'book';
              let mTitle = mediaItemId;
              let mYear: number | undefined = undefined;
              if (mediaItemId.includes(':')) {
                const [prefix, rawTitle] = mediaItemId.split(':', 2);
                if (['book', 'movie', 'concert'].includes(prefix)) {
                  mType = prefix;
                  const yearMatch = rawTitle.match(/^(.*)_(\d{4})$/);
                  if (yearMatch) {
                    mTitle = yearMatch[1].replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                    mYear = parseInt(yearMatch[2], 10);
                  } else {
                    mTitle = rawTitle.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                  }
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
                metadataJson: mYear ? { year: mYear } : {}
              };
            }

            let rawSource = val.source || mediaItem.metadataJson?.['source'];
            if (rawSource && (rawSource.includes('_autocomplete') || rawSource === 'musicbrainz_artist')) {
              rawSource = 'trackstar';
            }
            const normalizedSource = rawSource || 'trackstar';
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
              source: normalizedSource,
              sourceDisplayName: getSourceDisplayName(normalizedSource, mediaItem.mediaType),
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
      });

    } catch (err: any) {
      console.error('Failed to sync from PDS:', err);
      this.error.set(err?.message || 'Failed to sync with PDS');
    } finally {
      this.loading.set(false);
    }
  }

  // Set of media IDs that have already been enriched in this session
  private enrichedIds = new Set<string>();

  /**
   * On-demand targeted metadata & image enrichment for only the active/visible records.
   */
  async enrichItems(targetItems: PdsUserLog[]): Promise<void> {
    if (!targetItems || targetItems.length === 0) return;

    const mediaMap = new Map(this.mediaItems());
    let hasUpdates = false;

    // Filter to only items that lack covers and have not been resolved yet
    const toEnrich = targetItems.filter(log => {
      const mItem = log.mediaItem;
      if (!mItem) return false;
      const meta = typeof mItem.metadataJson === 'string'
        ? (() => { try { return JSON.parse(mItem.metadataJson); } catch { return {}; } })()
        : (mItem.metadataJson || {});
      const hasCover = meta['coverUrl'] || meta['cover_url'] || meta['poster_url'] || meta['posterUrl'] || meta['image_url'];
      if (hasCover) return false;
      const key = mItem.id || log.mediaItemId;
      if (this.enrichedIds.has(key)) return false;
      return true;
    });

    if (toEnrich.length === 0) return;

    // Mark items as checked
    toEnrich.forEach(log => {
      const key = log.mediaItem?.id || log.mediaItemId;
      if (key) this.enrichedIds.add(key);
    });

    for (const log of toEnrich) {
      const mItem = log.mediaItem;
      if (!mItem) continue;

      let meta = typeof mItem.metadataJson === 'string'
        ? (() => { try { return JSON.parse(mItem.metadataJson); } catch { return {}; } })()
        : { ...(mItem.metadataJson || {}) };

      try {
        const enriched = await this.metadataService.resolveMetadata(mItem.mediaType, mItem.title, mItem.id || log.mediaItemId);
        if (enriched && enriched.coverUrl) {
          const updatedMeta: Record<string, any> = {
            ...meta,
            ...enriched,
            coverUrl: enriched.coverUrl,
            poster_url: enriched.coverUrl
          };
          if (enriched.creator && (!meta['creator'] && !meta['author'] && !meta['artist'])) {
            updatedMeta['creator'] = enriched.creator;
          }
          if (enriched.year && !meta['year']) {
            updatedMeta['year'] = enriched.year;
          }
          mItem.metadataJson = updatedMeta;

          // Register all key aliases
          mediaMap.set(mItem.id, mItem);
          if (mItem.rkey) mediaMap.set(mItem.rkey, mItem);
          mediaMap.set(makeRkeySafe(mItem.id), mItem);
          if (mItem.id.includes(':')) {
            mediaMap.set(mItem.id.replace(/:/g, '_'), mItem);
          }

          hasUpdates = true;

          // Persist enriched media record back to PDS so it's permanently stored across reloads and devices
          if (this.auth.isAuthenticated()) {
            const mediaRkey = mItem.rkey || makeRkeySafe(mItem.id);
            this.executeWithAuth(async (agent, repo) => {
              const sanitizedRecord = sanitizeAtprotoRecord({
                $type: 'app.trackstar.media',
                id: mItem.id,
                mediaType: mItem.mediaType,
                title: mItem.title,
                metadataJson: mItem.metadataJson,
                createdAt: mItem.createdAt || new Date().toISOString()
              });

              await agent.com.atproto.repo.putRecord({
                collection: 'app.trackstar.media',
                repo: repo,
                rkey: mediaRkey,
                record: sanitizedRecord
              });
            }).catch(pdsErr => {
              console.warn('[PdsRepo] Background PDS media enrichment save skipped:', pdsErr);
            });
          }
        }
      } catch (enrichErr) {
        // silently continue
      }
    }

    if (hasUpdates) {
      this.mediaItems.set(mediaMap);
      this.logs.set([...this.logs()]);
      this.persistCache();
    }
  }

  async enrichMissingMetadata(targetItems?: PdsUserLog[]): Promise<void> {
    if (targetItems) {
      await this.enrichItems(targetItems);
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
    return await this.executeWithAuth(async (agent, repo) => {
      // 1. Determine canonical source (defaults to 'trackstar' for manual UI entries)
      const source = payload.source || 'trackstar';

      // 2. Prepare metadata
      let metadata = { ...(payload.metadataJson || {}) };
      metadata['source'] = source;
      metadata = sanitizeAtprotoRecord(metadata);

      // 3. Prepare Media Item record
      const mediaId = payload.mediaItemId || `${payload.mediaType}:${payload.title.toLowerCase().replace(/\s+/g, '_')}`;
      const mediaRkey = makeRkeySafe(mediaId);

      const mediaRecord = sanitizeAtprotoRecord({
        $type: 'app.trackstar.media',
        id: mediaId,
        mediaType: payload.mediaType,
        title: payload.title,
        metadataJson: metadata,
        createdAt: new Date().toISOString()
      });

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

      // 4. Prepare User Log record
      const logRkey = generateTid();
      const loggedAt = payload.loggedAt || new Date().toISOString();

      const logRecord: Record<string, any> = sanitizeAtprotoRecord({
        $type: 'app.trackstar.log',
        mediaItemId: mediaId,
        status: payload.status,
        rating: sanitizeRating(payload.rating),
        review: payload.review?.trim() || undefined,
        loggedAt: loggedAt,
        completedAt: payload.completedAt || (payload.status === 'completed' ? loggedAt : undefined),
        source: source
      });

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
        source: source,
        sourceDisplayName: getSourceDisplayName(source, payload.mediaType),
        mediaItem: savedMediaItem
      };

      // 4. Update reactive state signals
      const currentMedia = new Map(this.mediaItems());
      currentMedia.set(mediaId, savedMediaItem);
      currentMedia.set(mediaRkey, savedMediaItem);
      currentMedia.set(makeRkeySafe(mediaId), savedMediaItem);
      if (mediaId.includes(':')) {
        currentMedia.set(mediaId.replace(/:/g, '_'), savedMediaItem);
      }
      this.mediaItems.set(currentMedia);

      this.logs.update(logs => [newLog, ...logs]);
      this.persistCache();

      return newLog;
    });
  }

  async deleteLog(log: PdsUserLog): Promise<void> {
    await this.executeWithAuth(async (agent, repo) => {
      await agent.com.atproto.repo.deleteRecord({
        collection: 'app.trackstar.log',
        repo: repo,
        rkey: log.id
      });

      // Remove from in-memory signals
      this.logs.update(logs => logs.filter(l => l.id !== log.id));
      this.persistCache();
    });
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
