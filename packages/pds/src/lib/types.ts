/**
 * AT Protocol / PDS Core Authentication and Session Types
 */
export interface PdsUserSession {
  did: string;
  handle: string;
  email?: string;
  pdsUrl: string;
  accessJwt: string;
  refreshJwt: string;
}

export interface PdsConfig {
  pdsUrl: string;
  handle: string;
  password?: string;
  accessJwt?: string;
  refreshJwt?: string;
  did?: string;
}

export interface PdsMediaItem {
  id: string; // e.g. "isbn:978...", "tmdb:123", "setlist:456", or slug
  mediaType: string; // "book", "movie", "concert", "music"
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
  mediaType: string; // "book", "movie", "concert", "music"
  title: string;
  status: string; // "want_to_consume", "consuming", "completed", "dropped"
  rating?: number;
  review?: string;
  loggedAt: string;
  completedAt?: string;
  startedAt?: string;
  source?: string;
  sourceDisplayName?: string;
  metadata?: Record<string, any>;
  metadataJson?: Record<string, any>;
  mediaItemId?: string;
  mediaItem?: PdsMediaItem;
}

export interface CreateLogPayload {
  mediaType: string;
  title: string;
  status: string;
  rating?: number;
  review?: string;
  completedAt?: string;
  startedAt?: string;
  loggedAt?: string;
  source?: string;
  metadata?: Record<string, any>;
  metadataJson?: Record<string, any>;
  mediaItemId?: string;
}

export interface AtpRecord<T = Record<string, any>> {
  uri: string;
  cid?: string;
  value: T;
}

export interface ListRecordsResponse<T = Record<string, any>> {
  cursor?: string;
  records: AtpRecord<T>[];
}

export interface XrpcRequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  token?: string;
}
