import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EnrichedMetadata, AutocompleteItem } from '@trackstar/data';
import { MetadataResolver } from '@trackstar/integrations';

export type { EnrichedMetadata, AutocompleteItem };

const TMDB_KEY_STORAGE = 'trackstar_tmdb_api_key';

@Injectable({
  providedIn: 'root'
})
export class DirectMetadataService {
  private http = inject(HttpClient);
  private resolver = new MetadataResolver(() => ({
    tmdbApiKey: this.getTmdbApiKey()
  }));

  // TMDB API Key
  getTmdbApiKey(): string {
    return localStorage.getItem(TMDB_KEY_STORAGE) || '';
  }

  setTmdbApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(TMDB_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(TMDB_KEY_STORAGE);
    }
  }

  // =========================================================================
  // TYPEAHEAD AUTOCOMPLETE SEARCH
  // =========================================================================
  async searchAutocomplete(mediaType: string, query: string): Promise<AutocompleteItem[]> {
    const q = query.trim();
    if (!q || q.length < 2) return [];

    switch (mediaType) {
      case 'movie':
        return this.searchMoviesAutocomplete(q);
      case 'book':
        return this.searchBooksAutocomplete(q);
      case 'concert':
        return this.searchConcertsAutocomplete(q);
      default:
        return [];
    }
  }

  // Movies: TMDB Autocomplete
  async searchMoviesAutocomplete(query: string): Promise<AutocompleteItem[]> {
    const apiKey = this.getTmdbApiKey();
    if (!apiKey) return [];

    try {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&page=1`;
      const res: any = await firstValueFrom(this.http.get(url));
      if (res && res.results && Array.isArray(res.results)) {
        return res.results.slice(0, 6).map((m: any) => {
          const year = m.release_date ? m.release_date.split('-')[0] : undefined;
          const posterSmall = m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : undefined;
          const posterLarge = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined;

          return {
            id: `tmdb:${m.id}`,
            title: m.title,
            year: year,
            coverUrl: posterSmall,
            description: m.overview,
            mediaType: 'movie' as const,
            metadataJson: {
              tmdb_id: m.id,
              coverUrl: posterLarge,
              poster_url: posterLarge,
              year: year ? parseInt(year, 10) : undefined,
              overview: m.overview,
              vote_average: m.vote_average != null ? String(m.vote_average) : undefined
            }
          };
        });
      }
    } catch (err) {
      console.warn('TMDB autocomplete search failed:', err);
    }
    return [];
  }

  // Books: Open Library Autocomplete (Free & CORS enabled)
  async searchBooksAutocomplete(query: string): Promise<AutocompleteItem[]> {
    try {
      const cleanQ = query.replace(/\s*\(.*?\)\s*/g, '').trim();
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQ)}&limit=6`;
      const res: any = await firstValueFrom(this.http.get(url));

      if (res && res.docs && Array.isArray(res.docs)) {
        return res.docs.slice(0, 6).map((doc: any) => {
          const author = doc.author_name ? doc.author_name.join(', ') : undefined;
          const year = doc.first_publish_year ? String(doc.first_publish_year) : undefined;
          const isbn = doc.isbn && doc.isbn.length > 0 ? doc.isbn[0] : undefined;
          
          let coverUrl: string | undefined = undefined;
          if (doc.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
          } else if (isbn) {
            coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
          }

          const bookId = isbn ? `isbn:${isbn}` : (doc.key ? `openlibrary:${doc.key.replace('/works/', '')}` : `book:${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);

          return {
            id: bookId,
            title: doc.title,
            year: year,
            creator: author,
            coverUrl: coverUrl,
            description: doc.subject ? `Genres: ${doc.subject.slice(0, 3).join(', ')}` : undefined,
            mediaType: 'book' as const,
            metadataJson: {
              author: author,
              creator: author,
              year: year ? parseInt(year, 10) : undefined,
              isbn: isbn,
              coverUrl: coverUrl,
              openlibrary_key: doc.key
            }
          };
        });
      }
    } catch (err) {
      console.warn('Open Library autocomplete search failed:', err);
    }
    return [];
  }

  // Helper to extract artist name from concert title (e.g. "Radiohead @ Madison Square Garden" -> "Radiohead")
  private extractArtistName(rawTitle: string): string {
    let clean = rawTitle.replace(/\s*\(\d{4}\)$/, '').trim();
    if (clean.includes(' @ ')) {
      clean = clean.split(' @ ')[0].trim();
    } else if (clean.includes(' at ')) {
      clean = clean.split(' at ')[0].trim();
    } else if (clean.includes(' - ')) {
      clean = clean.split(' - ')[0].trim();
    } else if (clean.toLowerCase().includes(' live at ')) {
      clean = clean.split(/ live at /i)[0].trim();
    }
    return clean;
  }

  // Concerts: MediaWiki Artist Autocomplete (with MusicBrainz fallback)
  async searchConcertsAutocomplete(query: string): Promise<AutocompleteItem[]> {
    const cleanQ = this.extractArtistName(query.trim());
    if (!cleanQ) return [];

    // 1. Search MediaWiki for musical acts with photos
    try {
      const MUSIC_TERMS = ['band', 'musician', 'singer', 'music', 'duo', 'trio', 'group', 'rapper', 'orchestra', 'dj', 'rock', 'pop', 'hip hop', 'song', 'composer'];

      const fetchWiki = async (q: string) => {
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=6&prop=pageimages|description&pithumbsize=300&format=json&origin=*`;
        const res: any = await firstValueFrom(this.http.get(url, {
          headers: { 'Api-User-Agent': 'TrackStar/1.0 (https://github.com/kthom91/trackstar; contact@trackstar.local)' }
        }));
        if (!res?.query?.pages) return [];
        return Object.values(res.query.pages).sort((a: any, b: any) => a.index - b.index);
      };

      let pages = await fetchWiki(cleanQ);
      let musicPages = pages.filter((p: any) => {
        const d = (p.description || '').toLowerCase();
        const t = (p.title || '').toLowerCase();
        return MUSIC_TERMS.some(w => d.includes(w) || t.includes(w));
      });

      if (musicPages.length === 0 && !cleanQ.toLowerCase().includes('band')) {
        const bandPages = await fetchWiki(`${cleanQ} band`);
        const found = bandPages.filter((p: any) => {
          const d = (p.description || '').toLowerCase();
          const t = (p.title || '').toLowerCase();
          return MUSIC_TERMS.some(w => d.includes(w) || t.includes(w));
        });
        if (found.length > 0) {
          musicPages = found;
        }
      }

      const candidates = musicPages.length > 0 ? musicPages : pages;
      if (candidates.length > 0) {
        return candidates.slice(0, 6).map((p: any) => {
          const cleanName = (p.title || '').replace(/\s*\(.*?\)$/, '').trim();
          const cover = p.thumbnail?.source;
          return {
            id: `concert:${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
            title: cleanName,
            creator: cleanName,
            coverUrl: cover,
            description: p.description || 'Musical Artist',
            mediaType: 'concert' as const,
            metadataJson: {
              artist: cleanName,
              creator: cleanName,
              coverUrl: cover,
              poster_url: cover,
              description: p.description,
              wikipedia_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/\s+/g, '_'))}`
            }
          };
        });
      }
    } catch (err) {
      console.warn('Wikipedia concert autocomplete failed, trying fallbacks:', err);
    }

    // 2. MusicBrainz Fallback (Free & open artist directory)
    try {
      const mbUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(cleanQ)}&fmt=json&limit=5`;
      const res: any = await firstValueFrom(this.http.get(mbUrl));

      if (res && res.artists && Array.isArray(res.artists)) {
        return res.artists.slice(0, 5).map((a: any) => ({
          id: `concert:${a.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          title: a.name,
          creator: a.disambiguation || a.type || 'Artist',
          description: a.area ? `${a.area.name} • Active since ${a['life-span']?.begin || 'N/A'}` : a.type,
          mediaType: 'concert' as const,
          metadataJson: {
            artist: a.name,
            mbid: a.id
          }
        }));
      }
    } catch (err) {
      console.warn('MusicBrainz artist search failed:', err);
    }

    return [];
  }

  // In-memory lookup cache to prevent duplicate network calls
  private cache = new Map<string, EnrichedMetadata>();

  // =========================================================================
  // METADATA RESOLUTION (BY TITLE / HINT)
  // =========================================================================
  async resolveMetadata(mediaType: string, title: string, hintId?: string): Promise<EnrichedMetadata> {
    const cleanTitle = title?.trim() || '';
    if (!cleanTitle) return {};

    const cacheKey = `${mediaType?.toLowerCase()}:${(hintId || cleanTitle).toLowerCase().trim()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let result: EnrichedMetadata = {};

    switch (mediaType?.toLowerCase()) {
      case 'book':
        result = await this.resolveBookMetadata(cleanTitle, hintId);
        break;
      case 'movie':
      case 'film':
        result = await this.resolveMovieMetadata(cleanTitle, hintId);
        break;
      case 'concert':
      case 'live':
        result = await this.resolveConcertMetadata(cleanTitle, hintId);
        break;
      default:
        result = {};
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  // 1. Books: Open Library API (CORS enabled, completely free)
  async resolveBookMetadata(title: string, isbnHint?: string): Promise<EnrichedMetadata> {
    try {
      if (isbnHint && isbnHint.startsWith('isbn:')) {
        const isbn = isbnHint.replace('isbn:', '').replace(/[^0-9X]/gi, '');
        if (isbn.length >= 10) {
          return {
            coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
          };
        }
      }

      const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').trim();
      const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanTitle)}&limit=1`;
      const searchData: any = await firstValueFrom(this.http.get(searchUrl));
      if (searchData && searchData.docs && searchData.docs.length > 0) {
        const doc = searchData.docs[0];
        const coverId = doc.cover_i;
        const author = doc.author_name ? doc.author_name.join(', ') : undefined;
        return {
          coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined,
          creator: author,
          year: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
          genres: doc.subject ? doc.subject.slice(0, 3) : undefined
        };
      }
    } catch (err) {
      console.warn('Open Library metadata lookup skipped or failed:', err);
    }
    return {};
  }

  // 2. Movies: TMDB API (Using API key from LocalStorage)
  async resolveMovieMetadata(title: string, tmdbHint?: string): Promise<EnrichedMetadata> {
    const apiKey = this.getTmdbApiKey();
    if (!apiKey) {
      return {};
    }

    try {
      if (tmdbHint && tmdbHint.startsWith('tmdb:')) {
        const tmdbId = tmdbHint.replace('tmdb:', '').trim();
        if (tmdbId && !isNaN(Number(tmdbId))) {
          const directUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`;
          const movie: any = await firstValueFrom(this.http.get(directUrl));
          if (movie && movie.poster_path) {
            const posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
            return {
              coverUrl: posterUrl,
              poster_url: posterUrl,
              description: movie.overview,
              year: movie.release_date ? movie.release_date.split('-')[0] : undefined,
              creator: movie.tagline,
              vote_average: movie.vote_average != null ? String(movie.vote_average) : undefined
            };
          }
        }
      }

      // Check if title or hint has a release year (e.g. "The Odyssey (2026)" or "movie:the_odyssey_2026")
      let searchYear: string | undefined = undefined;
      const yearMatch = title.match(/\((\d{4})\)$/);
      if (yearMatch) {
        searchYear = yearMatch[1];
      } else if (tmdbHint && tmdbHint.includes('_')) {
        const hintYearMatch = tmdbHint.match(/_(\d{4})$/);
        if (hintYearMatch) {
          searchYear = hintYearMatch[1];
        }
      }

      const cleanTitle = title.replace(/\s*\(\d{4}\)$/, '').trim();
      let searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&include_adult=false`;
      if (searchYear) {
        searchUrl += `&primary_release_year=${searchYear}`;
      }

      let res: any = await firstValueFrom(this.http.get(searchUrl));
      // Fallback to query without year if no results
      if ((!res || !res.results || res.results.length === 0) && searchYear) {
        const broadUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&include_adult=false`;
        res = await firstValueFrom(this.http.get(broadUrl));
      }

      if (res && res.results && res.results.length > 0) {
        const movie = res.results[0];
        const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined;
        return {
          coverUrl: posterUrl,
          poster_url: posterUrl,
          description: movie.overview,
          year: movie.release_date ? movie.release_date.split('-')[0] : undefined,
          vote_average: movie.vote_average != null ? String(movie.vote_average) : undefined
        };
      }
    } catch (err) {
      console.warn('TMDB movie metadata lookup failed:', err);
    }
    return {};
  }

  // 3. Concerts: MediaWiki (Wikidata & Wikipedia) Metadata Resolver
  async resolveConcertMetadata(title: string, hintId?: string): Promise<EnrichedMetadata> {
    return this.resolver.resolveConcertMetadata(title, hintId);
  }
}
