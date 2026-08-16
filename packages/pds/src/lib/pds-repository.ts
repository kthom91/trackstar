import { LEXICONS } from './lexicons';
import { generateTid, makeRkeySafe } from './tid';
import { sanitizeAtprotoRecord, sanitizeRating } from './sanitize';
import { PdsMediaItem, PdsUserLog, CreateLogPayload, AtpRecord } from './types';
import { PdsXrpcClient } from './xrpc-client';

export class PdsRepositoryCore {
  constructor(private client: PdsXrpcClient) {}

  /**
   * Fetch and join all media and user logs from PDS.
   */
  async fetchMediaAndLogs(did: string): Promise<{
    logs: PdsUserLog[];
    mediaMap: Map<string, PdsMediaItem>;
  }> {
    const [mediaRecords, logRecords] = await Promise.all([
      this.client.listAllRecords(did, LEXICONS.MEDIA),
      this.client.listAllRecords(did, LEXICONS.LOG)
    ]);

    const mediaMap = new Map<string, PdsMediaItem>();
    mediaRecords.forEach((r: AtpRecord) => {
      const val = r.value || {};
      const rkey = r.uri.split('/').pop() || '';
      const id = val.id || rkey;
      mediaMap.set(id, {
        id,
        mediaType: val.mediaType || 'other',
        title: val.title || 'Untitled',
        metadataJson: val.metadataJson || val.metadata || {},
        createdAt: val.createdAt,
        atUri: r.uri,
        rkey
      });
    });

    const logs: PdsUserLog[] = logRecords.map((r: AtpRecord) => {
      const val = r.value || {};
      const rkey = r.uri.split('/').pop() || '';
      const mediaItemId = val.mediaItemId || '';
      const mediaItem = mediaMap.get(mediaItemId);

      return {
        id: rkey,
        atUri: r.uri,
        atCid: r.cid,
        mediaItemId,
        status: val.status || 'completed',
        rating: val.rating !== undefined ? Number(val.rating) : undefined,
        review: val.review,
        loggedAt: val.loggedAt || new Date().toISOString(),
        completedAt: val.completedAt,
        source: val.source,
        mediaItem
      };
    });

    // Sort by loggedAt descending
    logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

    return { logs, mediaMap };
  }

  /**
   * Create or update a log entry and its associated media item in PDS.
   */
  async createLog(
    did: string,
    accessJwt: string,
    payload: CreateLogPayload
  ): Promise<{ logUri: string; logRkey: string; mediaItemId: string }> {
    // 1. Determine media item ID and ensure media record exists
    let mediaItemId = payload.mediaItemId;
    if (!mediaItemId) {
      const safeTitle = makeRkeySafe(payload.title.toLowerCase());
      mediaItemId = `${payload.mediaType}_${safeTitle}`;
    }

    const mediaRkey = makeRkeySafe(mediaItemId);
    const source = payload.source || 'trackstar';
    let metadata = { ...(payload.metadataJson || {}) };
    metadata['source'] = source;
    metadata = sanitizeAtprotoRecord(metadata);

    const mediaRecord = sanitizeAtprotoRecord({
      $type: LEXICONS.MEDIA,
      id: mediaItemId,
      mediaType: payload.mediaType,
      title: payload.title.trim(),
      metadataJson: metadata,
      createdAt: new Date().toISOString()
    });

    await this.client.putRecord(did, LEXICONS.MEDIA, mediaRkey, mediaRecord, accessJwt);

    // 2. Create the log record
    const logRkey = generateTid();
    const now = new Date().toISOString();
    const logRecord = sanitizeAtprotoRecord({
      $type: LEXICONS.LOG,
      mediaItemId,
      status: payload.status,
      rating: sanitizeRating(payload.rating),
      review: payload.review?.trim() || undefined,
      loggedAt: payload.loggedAt || now,
      completedAt: payload.completedAt || (payload.status === 'completed' ? now : undefined),
      source: source
    });

    const res = await this.client.putRecord(did, LEXICONS.LOG, logRkey, logRecord, accessJwt);

    return {
      logUri: res.uri,
      logRkey,
      mediaItemId
    };
  }

  /**
   * Delete a log record from PDS.
   */
  async deleteLog(did: string, accessJwt: string, logRkey: string): Promise<void> {
    await this.client.deleteRecord(did, LEXICONS.LOG, logRkey, accessJwt);
  }
}
