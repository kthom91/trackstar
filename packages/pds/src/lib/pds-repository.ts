import { LEXICONS } from './lexicons';
import { generateTid } from './tid';
import { sanitizeAtprotoRecord, sanitizeRating } from './sanitize';
import { PdsUserLog, CreateLogPayload, AtpRecord } from './types';
import { PdsXrpcClient } from './xrpc-client';

export class PdsRepositoryCore {
  constructor(private client: PdsXrpcClient) {}

  /**
   * Fetch all user logs from PDS (app.trackstar.log) with backwards compatibility.
   */
  async fetchLogs(did: string): Promise<PdsUserLog[]> {
    const logRecords = await this.client.listAllRecords(did, LEXICONS.LOG);

    const logs: PdsUserLog[] = logRecords.map((r: AtpRecord) => {
      const val = r.value || {};
      const rkey = r.uri.split('/').pop() || '';
      const metadata = val.metadata || val.metadataJson || {};

      return {
        id: rkey,
        atUri: r.uri,
        atCid: r.cid,
        mediaType: val.mediaType || 'book',
        title: val.title || 'Untitled',
        status: val.status || 'completed',
        rating: val.rating !== undefined ? Number(val.rating) : undefined,
        review: val.review,
        loggedAt: val.loggedAt || new Date().toISOString(),
        completedAt: val.completedAt,
        startedAt: val.startedAt,
        source: val.source || 'trackstar',
        metadata: metadata,
        metadataJson: metadata,
        mediaItemId: val.mediaItemId || rkey
      };
    });

    // Sort by loggedAt descending
    logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

    return logs;
  }

  /**
   * Backwards-compatible alias for fetchLogs.
   */
  async fetchMediaAndLogs(did: string): Promise<{
    logs: PdsUserLog[];
    mediaMap: Map<string, any>;
  }> {
    const logs = await this.fetchLogs(did);
    const mediaMap = new Map<string, any>();
    logs.forEach(l => {
      mediaMap.set(l.mediaItemId || l.id, {
        id: l.mediaItemId || l.id,
        mediaType: l.mediaType,
        title: l.title,
        metadataJson: l.metadata,
        rkey: l.id
      });
    });
    return { logs, mediaMap };
  }

  /**
   * Create or update a unified log entry in PDS.
   */
  async createLog(
    did: string,
    accessJwt: string,
    payload: CreateLogPayload
  ): Promise<{ logUri: string; logRkey: string; mediaItemId?: string }> {
    const logRkey = generateTid();
    const now = new Date().toISOString();
    const source = payload.source || 'trackstar';
    
    let metadata = { ...(payload.metadata || payload.metadataJson || {}) };
    metadata['source'] = source;
    metadata = sanitizeAtprotoRecord(metadata);

    const logRecord = sanitizeAtprotoRecord({
      $type: LEXICONS.LOG,
      mediaType: payload.mediaType,
      title: payload.title.trim(),
      status: payload.status,
      rating: sanitizeRating(payload.rating),
      review: payload.review?.trim() || undefined,
      loggedAt: payload.loggedAt || now,
      completedAt: payload.completedAt || (payload.status === 'completed' ? now : undefined),
      startedAt: payload.startedAt,
      source: source,
      metadata: metadata,
      metadataJson: metadata,
      mediaItemId: payload.mediaItemId
    });

    const res = await this.client.putRecord(did, LEXICONS.LOG, logRkey, logRecord, accessJwt);

    return {
      logUri: res.uri,
      logRkey,
      mediaItemId: payload.mediaItemId || logRkey
    };
  }

  /**
   * Delete a log record from PDS.
   */
  async deleteLog(did: string, accessJwt: string, logRkey: string): Promise<void> {
    await this.client.deleteRecord(did, LEXICONS.LOG, logRkey, accessJwt);
  }
}
