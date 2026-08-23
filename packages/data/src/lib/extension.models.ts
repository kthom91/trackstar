import { PdsConfig } from './pds.models';

export interface ExtensionMediaItem {
  rkey: string;
  atUri: string;
  mediaItemId: string;
  mediaType: string;
  title: string;
  author?: string;
  venue?: string;
  city?: string;
  year?: string | number;
  letterboxdUrl?: string;
  coverUrl?: string;
  status: string;
  rating?: number | null;
  review?: string;
  completedAt?: string;
  loggedAt?: string;
  source: string;
  isOriginal: boolean;
  isSynced: boolean;
}

export interface LetterboxdSyncPayload {
  rkey: string;
  atUri: string;
  title: string;
  year?: string | number;
  rating?: number | null;
  rating10?: number | null;
  review?: string;
  watchedDate?: string;
  tags?: string;
  action: string;
}

export interface LetterboxdRssItem {
  link: string;
  title: string;
  year?: string;
  rating?: number | null;
  watchedDate?: string;
  coverUrl?: string;
}

export interface RssPollState {
  polling: boolean;
  newCount: number;
  totalCount: number;
  error: string;
}

export interface SetlistSyncState {
  syncing: boolean;
  page: number;
  totalPages: number;
  processed: number;
  total: number;
  error: string;
  success: boolean;
}

export interface BatchIngestRecord {
  mediaType?: string;
  title: string;
  author?: string;
  creator?: string;
  isbn?: string;
  year?: string | number;
  coverUrl?: string;
  status?: string;
  rating?: number | string;
  review?: string;
  completedDate?: string;
  watchedDate?: string;
  date?: string;
  letterboxdUrl?: string;
  tags?: string[];
  source?: string;
}

export interface BatchIngestResult {
  success: boolean;
  count: number;
  total: number;
  errors: { title: string; error: string }[];
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: string;
  avatarClass: string;
  logoSrc?: string;
  avatarText?: string;
  exportLabel: string;
  exportUrl: string;
  exportTooltip?: string;
  syncLabel?: string | null;
  syncTooltip?: string;
  getSyncCount?: (media: ExtensionMediaItem[]) => number;
  diaryLabel?: string | null;
  diaryTooltip?: string;
  getDiaryCount?: (media: ExtensionMediaItem[]) => number;
  onExport?: (config: PdsConfig, media: ExtensionMediaItem[]) => Promise<void> | void;
  onSync?: (config: PdsConfig, media: ExtensionMediaItem[]) => Promise<void> | void;
  hasRssPoll?: boolean;
}
