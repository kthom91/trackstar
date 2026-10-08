import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrackstarModule, LexiconRecord, NormalizedTimelineItem } from '../registry.models';
// import { TvCardComponent } from '../../../../../../apps/frontend/src/app/components/timeline-cards/tv-card/tv-card.component';

// Mock TMDB Response Types
export interface TmdbTvResult {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string;
}

export interface TvLexiconValue {
  title: string;
  creator?: string;
  firstAirYear?: number;
  posterUrl?: string;
  status: string;
  rating?: number;
  review?: string;
  tmdbId?: string;
  source: string;
}

export const TvShowModule: TrackstarModule<TmdbTvResult, TvLexiconValue> = {
  lexiconId: 'app.trackstar.tv',
  displayName: 'TV Show',
  icon: 'tv', // lucide icon name

  searchProvider: (query: string, apiKey?: string): Observable<TmdbTvResult[]> => {
    // TMDB Search API (Client-side, requires user to supply an API key or use a proxy if CORS is an issue, but TMDB supports CORS)
    const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&api_key=${apiKey}`;
    return from(fetch(url).then(res => res.json())).pipe(
      map(data => data.results || [])
    );
  },

  mapProviderToLexicon: (providerResult: TmdbTvResult): TvLexiconValue => {
    return {
      title: providerResult.name,
      firstAirYear: providerResult.first_air_date ? parseInt(providerResult.first_air_date.substring(0, 4), 10) : undefined,
      posterUrl: providerResult.poster_path ? `https://image.tmdb.org/t/p/w500${providerResult.poster_path}` : undefined,
      tmdbId: providerResult.id.toString(),
      source: 'tmdb',
      status: 'want_to_consume' // default
    };
  },

  normalizeRecord: (record: LexiconRecord<TvLexiconValue>): NormalizedTimelineItem => {
    return {
      id: record.cid,
      lexiconId: 'app.trackstar.tv',
      title: record.value.title,
      subtitle: record.value.firstAirYear ? `First aired ${record.value.firstAirYear}` : undefined,
      date: new Date(record.value.createdAt),
      imageUrl: record.value.posterUrl,
      status: record.value.status,
      rawRecord: record
    };
  },

  manualEntryForm: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'firstAirYear', label: 'First Air Year', type: 'number', required: false },
    { key: 'creator', label: 'Creator / Showrunner', type: 'text', required: false },
    { key: 'posterUrl', label: 'Poster URL', type: 'url', required: false }
  ],

  // Placeholder for the Angular component reference. 
  // Normally we would pass TvCardComponent here, but using 'any' to avoid circular/deep imports in this data library.
  timelineCardComponent: null as any
};
