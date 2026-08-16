import { MediaType, LogStatus } from '@trackstar/data';

export type { MediaType, LogStatus };

export type IntegrationCategory = 'movie' | 'book' | 'concert' | 'music' | 'mixed';

export type IntegrationCapability =
  | 'csv_import'
  | 'rss_sync'
  | 'api_sync'
  | 'extension_sync'
  | 'export_csv';

export interface NormalizedMediaEntry {
  mediaType: MediaType;
  title: string;
  status: LogStatus;
  rating?: number; // Normalized 1 to 5 integer or half-star
  review?: string;
  completedAt?: string; // ISO 8601 string
  loggedAt?: string; // ISO 8601 string
  source: string; // 'letterboxd' | 'storygraph' | 'goodreads' | 'setlistfm' | 'teal'
  externalId?: string; // ISBN, Setlist ID, Letterboxd URI, etc.
  externalUrl?: string;
  tags?: string[];
  metadata: {
    author?: string;
    director?: string;
    artist?: string;
    venue?: string;
    city?: string;
    country?: string;
    year?: string | number;
    isbn?: string;
    coverUrl?: string;
    letterboxd_url?: string;
    setlist_url?: string;
    tags?: string[];
    source?: string;
    [key: string]: any;
  };
}

export interface ParsedIntegrationResult {
  providerId: string;
  sourceName: string;
  total: number;
  entries: NormalizedMediaEntry[];
  errors: { item?: string; error: string; raw?: any }[];
  warnings?: string[];
}

export interface CsvParseOptions {
  filename?: string;
  defaultStatus?: LogStatus;
  onProgress?: (processed: number, total: number) => void;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  mediaType: MediaType;
  accentColor: string;
  avatarText: string;
  logoUrl?: string;

  // Guides & Instructions
  exportGuideUrl?: string;
  exportGuideLabel?: string;
  exportInstructions?: string;

  // Capabilities
  capabilities: readonly IntegrationCapability[];
  acceptedFileExtensions?: readonly string[];

  // Parsing & Processing methods
  parseCsv?: (content: string | File, options?: CsvParseOptions) => Promise<ParsedIntegrationResult>;
  parseRss?: (xmlText: string) => Promise<ParsedIntegrationResult>;

  // CSV format identification
  matchesCsvHeader?: (headers: string[], filename?: string) => boolean;
}
