export interface EnrichedMetadata {
  coverUrl?: string;
  creator?: string;
  year?: string;
  description?: string;
  genres?: string[];
  externalUrl?: string;
  source?: string;
  raw?: Record<string, any>;
  [key: string]: any;
}

export interface AutocompleteItem {
  id: string;
  title: string;
  year?: string;
  creator?: string;
  coverUrl?: string;
  description?: string;
  mediaType: 'book' | 'movie' | 'concert';
  metadataJson?: Record<string, any>;
}
