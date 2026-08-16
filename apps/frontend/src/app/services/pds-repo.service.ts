import { Injectable, inject, signal } from '@angular/core';
import { BskyAgent } from '@atproto/api';
import {
  PdsMediaItem,
  PdsUserLog,
  generateTid,
  getSourceDisplayName,
  sanitizeAtprotoRecord,
  sanitizeRating
} from '@trackstar/data';
import { DirectMetadataService } from './direct-metadata.service';
import { PdsAuthService } from './pds-auth.service';

export { PdsRepoService as PdsRepositoryService };
export type { PdsMediaItem, PdsUserLog };

const CACHE_KEY = 'trackstar_logs_cache';

@Injectable({
  providedIn: 'root'
})
export class PdsRepoService {
  private auth = inject(PdsAuthService);
  private metadataService = inject(DirectMetadataService);

  readonly logs = signal<PdsUserLog[]>(this.loadCachedLogs());
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  constructor() {
    // Automatically sync when user logs in
    if (this.auth.isAuthenticated()) {
      this.syncFromPds();
    }
  }

  private loadCachedLogs(): PdsUserLog[] {
    try {
      // Check primary unified cache key
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persistCache(): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.logs()));
    } catch (e) {
      console.warn('Failed to persist PDS cache to localStorage:', e);
    }
  }

  /**
   * Helper to execute an XRPC operation with automatic token refresh and DPoP support.
   */
  private async executeWithAuth<T>(operation: (agent: any, repo: string) => Promise<T>): Promise<T> {
    const session = this.auth.session();
    if (!session) {
      throw new Error('Not authenticated to PDS');
    }

    const agent = this.auth.getAgent();

    try {
      return await operation(agent, session.did);
    } catch (err: any) {
      // Check if error is due to expired access token
      const isAuthErr =
        err?.status === 401 ||
        err?.error === 'ExpiredToken' ||
        err?.message?.includes('ExpiredToken') ||
        err?.message?.includes('Authentication Required');

      if (isAuthErr && session.refreshJwt) {
        console.log('[PdsRepo] Access token expired, attempting automatic session refresh...');
        const refreshed = await this.auth.refreshSession();
        if (refreshed) {
          const freshAgent = this.auth.getAgent();
          const newSession = this.auth.session()!;
          return await operation(freshAgent, newSession.did);
        }
      }
      throw err;
    }
  }

  /**
   * Sync all user records from PDS app.trackstar.log collection.
   */
  async syncFromPds(): Promise<void> {
    const session = this.auth.session();
    if (!session) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.executeWithAuth(async (agent, repo) => {
        const loadedLogs: PdsUserLog[] = [];
        let logCursor: string | undefined = undefined;

        // Fetch all app.trackstar.log records
        do {
          const res: any = await agent.com.atproto.repo.listRecords({
            collection: 'app.trackstar.log',
            repo: repo,
            limit: 100,
            cursor: logCursor
          });

          for (const rec of res.data.records) {
            const val = rec.value as any;
            const rkey = rec.uri.split('/').pop() || '';
            const rawId = val.mediaItemId || val.id || rkey;

            let metadata: Record<string, any> = {};
            if (val.metadata && typeof val.metadata === 'object') {
              metadata = { ...val.metadata };
            } else if (val.metadataJson) {
              metadata = typeof val.metadataJson === 'string' ? JSON.parse(val.metadataJson) : { ...val.metadataJson };
            }

            const mediaType = val.mediaType || val.media?.mediaType || 'book';
            const title = val.title || val.media?.title || rawId.replace(/^[^:]+:/, '').replace(/_/g, ' ') || 'Untitled';

            let rawSource = val.source || metadata['source'];
            if (rawSource && (rawSource.includes('_autocomplete') || rawSource === 'musicbrainz_artist')) {
              rawSource = 'trackstar';
            }
            const normalizedSource = rawSource || 'trackstar';

            const mediaItem: PdsMediaItem = {
              id: rawId,
              mediaType: mediaType,
              title: title,
              metadataJson: metadata,
              createdAt: val.loggedAt || val.createdAt,
              atUri: rec.uri,
              rkey: rkey
            };

            const log: PdsUserLog = {
              id: rkey,
              atUri: rec.uri,
              atCid: rec.cid,
              mediaType: mediaType,
              title: title,
              mediaItemId: rawId,
              status: val.status || 'completed',
              rating: val.rating !== undefined ? Number(val.rating) : undefined,
              review: val.review,
              loggedAt: val.loggedAt || new Date().toISOString(),
              completedAt: val.completedAt,
              startedAt: val.startedAt,
              source: normalizedSource,
              sourceDisplayName: getSourceDisplayName(normalizedSource, mediaType),
              metadata: metadata,
              metadataJson: metadata,
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

  // Set of record keys that have already been enriched in this session
  private enrichedIds = new Set<string>();

  /**
   * On-demand targeted metadata & image enrichment for active/visible records.
   */
  async enrichItems(targetItems: PdsUserLog[]): Promise<void> {
    if (!targetItems || targetItems.length === 0) return;

    let hasUpdates = false;

    const toEnrich = targetItems.filter(log => {
      const meta = log.metadata || log.metadataJson || {};
      const hasCover = meta['coverUrl'] || meta['cover_url'] || meta['poster_url'] || meta['posterUrl'] || meta['image_url'];
      if (hasCover) return false;
      const key = log.id || log.mediaItemId || '';
      if (key && this.enrichedIds.has(key)) return false;
      return true;
    });

    if (toEnrich.length === 0) return;

    toEnrich.forEach(log => {
      const key = log.id || log.mediaItemId || '';
      if (key) this.enrichedIds.add(key);
    });

    for (const log of toEnrich) {
      const meta = { ...(log.metadata || log.metadataJson || {}) };

      try {
        const enriched = await this.metadataService.resolveMetadata(log.mediaType, log.title, log.mediaItemId || log.id);
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

          log.metadata = updatedMeta;
          log.metadataJson = updatedMeta;
          if (log.mediaItem) {
            log.mediaItem.metadataJson = updatedMeta;
          }

          hasUpdates = true;

          // Persist enriched record back to PDS
          if (this.auth.isAuthenticated()) {
            this.executeWithAuth(async (agent, repo) => {
              const sanitizedRecord = sanitizeAtprotoRecord({
                $type: 'app.trackstar.log',
                mediaType: log.mediaType,
                title: log.title,
                status: log.status,
                rating: sanitizeRating(log.rating),
                review: log.review?.trim() || undefined,
                loggedAt: log.loggedAt,
                completedAt: log.completedAt,
                startedAt: log.startedAt,
                source: log.source || 'trackstar',
                metadata: updatedMeta,
                metadataJson: updatedMeta
              });

              await agent.com.atproto.repo.putRecord({
                collection: 'app.trackstar.log',
                repo: repo,
                rkey: log.id,
                record: sanitizedRecord
              });
            }).catch(pdsErr => {
              console.warn('[PdsRepo] Background PDS log enrichment save skipped:', pdsErr);
            });
          }
        }
      } catch {
        // silently continue
      }
    }

    if (hasUpdates) {
      this.logs.set([...this.logs()]);
      this.persistCache();
    }
  }

  async enrichMissingMetadata(targetItems?: PdsUserLog[]): Promise<void> {
    if (targetItems) {
      await this.enrichItems(targetItems);
    }
  }

  /**
   * Create a single, self-contained app.trackstar.log entry in PDS.
   */
  async createLog(payload: {
    mediaType: string;
    title: string;
    status: string;
    rating?: number;
    review?: string;
    mediaItemId?: string;
    completedAt?: string;
    startedAt?: string;
    loggedAt?: string;
    source?: string;
    metadata?: Record<string, any>;
    metadataJson?: Record<string, any>;
  }): Promise<PdsUserLog> {
    return await this.executeWithAuth(async (agent, repo) => {
      const source = payload.source || 'trackstar';
      let metadata = { ...(payload.metadata || payload.metadataJson || {}) };
      metadata['source'] = source;
      metadata = sanitizeAtprotoRecord(metadata);

      const logRkey = generateTid();
      const loggedAt = payload.loggedAt || new Date().toISOString();
      const mediaId = payload.mediaItemId || `${payload.mediaType}:${payload.title.toLowerCase().replace(/\s+/g, '_')}`;

      const logRecord: Record<string, any> = sanitizeAtprotoRecord({
        $type: 'app.trackstar.log',
        mediaType: payload.mediaType,
        title: payload.title.trim(),
        status: payload.status,
        rating: sanitizeRating(payload.rating),
        review: payload.review?.trim() || undefined,
        loggedAt: loggedAt,
        completedAt: payload.completedAt || (payload.status === 'completed' ? loggedAt : undefined),
        startedAt: payload.startedAt,
        source: source,
        metadata: metadata,
        metadataJson: metadata,
        mediaItemId: mediaId
      });

      // Put unified User Log record directly into PDS
      const logRes = await agent.com.atproto.repo.putRecord({
        collection: 'app.trackstar.log',
        repo: repo,
        rkey: logRkey,
        record: logRecord
      });

      const mediaItem: PdsMediaItem = {
        id: mediaId,
        mediaType: payload.mediaType,
        title: payload.title.trim(),
        metadataJson: metadata,
        createdAt: loggedAt,
        atUri: logRes.data.uri,
        rkey: logRkey
      };

      const newLog: PdsUserLog = {
        id: logRkey,
        atUri: logRes.data.uri,
        atCid: logRes.data.cid,
        mediaType: payload.mediaType,
        title: payload.title.trim(),
        mediaItemId: mediaId,
        status: payload.status,
        rating: payload.rating,
        review: payload.review,
        loggedAt: loggedAt,
        completedAt: payload.completedAt || (payload.status === 'completed' ? loggedAt : undefined),
        startedAt: payload.startedAt,
        source: source,
        sourceDisplayName: getSourceDisplayName(source, payload.mediaType),
        metadata: metadata,
        metadataJson: metadata,
        mediaItem: mediaItem
      };

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
      result = result.filter(l => (l.mediaType || l.mediaItem?.mediaType) === type);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(l =>
        (l.title || l.mediaItem?.title || '').toLowerCase().includes(q) ||
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

      const type = log.mediaType || log.mediaItem?.mediaType || 'book';
      if (type in counts) {
        counts[type]++;
      }
    }
    return counts;
  }
}
