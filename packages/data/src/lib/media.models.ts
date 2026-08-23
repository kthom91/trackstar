import { PdsUserLog, CreateLogPayload } from './pds.models';

export type MediaType = 'book' | 'movie' | 'concert' | string;

export type LogStatus = 'want_to_consume' | 'consuming' | 'completed' | string;

export interface MediaItemMetadata {
  coverUrl?: string;
  cover_url?: string;
  posterUrl?: string;
  poster_url?: string;
  image_url?: string;
  artist_image?: string;
  author?: string;
  creator?: string;
  artist?: string;
  director?: string;
  venue?: string;
  city?: string;
  year?: number | string;
  isbn?: string;
  letterboxd_url?: string;
  setlist_url?: string;
  tags?: string[];
  source?: string;
  [key: string]: any;
}

export interface YearGroup {
  yearLabel: string;
  yearNumber: number | null;
  logs: PdsUserLog[];
  isExpanded: boolean;
  typeCounts: {
    book: number;
    movie: number;
    concert: number;
  };
}
