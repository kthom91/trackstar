import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface EnrichedMetadata {
  coverUrl?: string;
  creator?: string;
  description?: string;
  year?: string;
  genres?: string[];
  externalUrl?: string;
  raw?: Record<string, any>;
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

const TMDB_KEY_STORAGE = 'trackstar_tmdb_api_key';
const SETLIST_KEY_STORAGE = 'trackstar_setlist_fm_api_key';
const SETLIST_USER_STORAGE = 'trackstar_setlist_fm_user_id';

@Injectable({
  providedIn: 'root'
})
export class DirectMetadataService {
  private http = inject(HttpClient);

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

  // Setlist.fm Credentials
  getSetlistApiKey(): string {
    return localStorage.getItem(SETLIST_KEY_STORAGE) || '';
  }

  setSetlistApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(SETLIST_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(SETLIST_KEY_STORAGE);
    }
  }

  getSetlistUserId(): string {
    return localStorage.getItem(SETLIST_USER_STORAGE) || '';
  }

  setSetlistUserId(userId: string): void {
    if (userId.trim()) {
      localStorage.setItem(SETLIST_USER_STORAGE, userId.trim());
    } else {
      localStorage.removeItem(SETLIST_USER_STORAGE);
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
              vote_average: m.vote_average,
              source: 'tmdb_autocomplete'
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
              openlibrary_key: doc.key,
              source: 'openlibrary_autocomplete'
            }
          };
        });
      }
    } catch (err) {
      console.warn('Open Library autocomplete search failed:', err);
    }
    return [];
  }

  // Concerts: setlist.fm API Autocomplete (with MusicBrainz fallback)
  async searchConcertsAutocomplete(query: string): Promise<AutocompleteItem[]> {
    const apiKey = this.getSetlistApiKey();
    const cleanQ = query.trim();

    // 1. If user has setlist.fm API Key, search setlist.fm API
    if (apiKey) {
      try {
        const artist = cleanQ.split(' @ ')[0].split(' at ')[0].trim();
        const setlistUrl = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(artist)}&p=1`;

        let data: any = null;
        try {
          const headers = new HttpHeaders({ 'x-api-key': apiKey, 'Accept': 'application/json' });
          data = await firstValueFrom(this.http.get(setlistUrl, { headers }));
        } catch {
          // CORS fallback proxy
          const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(setlistUrl)}`;
          const headers = new HttpHeaders({ 'x-api-key': apiKey, 'Accept': 'application/json' });
          data = await firstValueFrom(this.http.get(proxyUrl, { headers }));
        }

        if (data && data.setlist && Array.isArray(data.setlist) && data.setlist.length > 0) {
          return data.setlist.slice(0, 6).map((s: any) => {
            const artistName = s.artist?.name || artist;
            const venueName = s.venue?.name || 'Live';
            const cityName = s.venue?.city ? `${s.venue.city.name}, ${s.venue.city.state || s.venue.city.country?.name || ''}` : '';
            
            // Format Date DD-MM-YYYY -> YYYY-MM-DD
            let isoDate = '';
            let year = '';
            if (s.eventDate) {
              const parts = s.eventDate.split('-');
              if (parts.length === 3) {
                isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                year = parts[2];
              }
            }

            const title = `${artistName} @ ${venueName}`;
            const desc = `${cityName} • ${s.eventDate || ''} ${s.tour?.name ? `(${s.tour.name})` : ''}`.trim();

            return {
              id: `setlist:${s.id}`,
              title: title,
              year: year,
              creator: artistName,
              description: desc,
              mediaType: 'concert' as const,
              metadataJson: {
                artist: artistName,
                venue: venueName,
                city: s.venue?.city?.name,
                country: s.venue?.city?.country?.name,
                eventDate: isoDate,
                year: year ? parseInt(year, 10) : undefined,
                setlist_url: s.url,
                tour: s.tour?.name,
                source: 'setlist_fm_api'
              }
            };
          });
        }
      } catch (err) {
        console.warn('setlist.fm search failed, trying MusicBrainz fallback:', err);
      }
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
            mbid: a.id,
            source: 'musicbrainz_artist'
          }
        }));
      }
    } catch (err) {
      console.warn('MusicBrainz artist search failed:', err);
    }

    return [];
  }

  // =========================================================================
  // METADATA RESOLUTION (BY TITLE / HINT)
  // =========================================================================
  async resolveMetadata(mediaType: string, title: string, hintId?: string): Promise<EnrichedMetadata> {
    switch (mediaType) {
      case 'book':
        return this.resolveBookMetadata(title, hintId);
      case 'movie':
        return this.resolveMovieMetadata(title, hintId);
      case 'concert':
        return this.resolveConcertMetadata(title, hintId);
      default:
        return {};
    }
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
          genres: doc.subject ? doc.subject.slice(0, 3) : undefined,
          raw: doc
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
            return {
              coverUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
              description: movie.overview,
              year: movie.release_date ? movie.release_date.split('-')[0] : undefined,
              creator: movie.tagline,
              raw: movie
            };
          }
        }
      }

      const cleanTitle = title.replace(/\s*\(\d{4}\)$/, '').trim();
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&include_adult=false`;
      const res: any = await firstValueFrom(this.http.get(searchUrl));
      if (res && res.results && res.results.length > 0) {
        const movie = res.results[0];
        return {
          coverUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
          description: movie.overview,
          year: movie.release_date ? movie.release_date.split('-')[0] : undefined,
          raw: movie
        };
      }
    } catch (err) {
      console.warn('TMDB movie metadata lookup failed:', err);
    }
    return {};
  }

  // 3. Concerts: setlist.fm Details Fetcher
  async resolveConcertMetadata(title: string, hintId?: string): Promise<EnrichedMetadata> {
    const apiKey = this.getSetlistApiKey();
    if (apiKey && hintId && hintId.startsWith('setlist:')) {
      const setlistId = hintId.replace('setlist:', '').trim();
      const url = `https://api.setlist.fm/rest/1.0/setlist/${setlistId}`;
      try {
        let setlist: any = null;
        try {
          const headers = new HttpHeaders({ 'x-api-key': apiKey, 'Accept': 'application/json' });
          setlist = await firstValueFrom(this.http.get(url, { headers }));
        } catch {
          const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
          const headers = new HttpHeaders({ 'x-api-key': apiKey, 'Accept': 'application/json' });
          setlist = await firstValueFrom(this.http.get(proxyUrl, { headers }));
        }

        if (setlist) {
          const artistName = setlist.artist?.name || '';
          const venue = setlist.venue?.name || '';
          const city = setlist.venue?.city ? `${setlist.venue.city.name}, ${setlist.venue.city.country?.name || ''}` : '';
          return {
            creator: artistName,
            description: `${venue} (${city})`,
            year: setlist.eventDate ? setlist.eventDate.split('-')[2] : undefined,
            externalUrl: setlist.url,
            raw: setlist
          };
        }
      } catch (err) {
        console.warn('setlist.fm concert lookup failed:', err);
      }
    }
    return {};
  }

  // 4. setlist.fm Attended Concerts API Fetcher (for bulk importer)
  async fetchSetlistFmPage(userId: string, apiKey: string, page: number = 1): Promise<any> {
    const cleanUser = userId.trim();
    const cleanKey = apiKey.trim();
    const targetUrl = `https://api.setlist.fm/rest/1.0/user/${encodeURIComponent(cleanUser)}/attended?p=${page}`;

    try {
      const headers = new HttpHeaders({
        'x-api-key': cleanKey,
        'Accept': 'application/json'
      });
      return await firstValueFrom(this.http.get(targetUrl, { headers }));
    } catch (directErr) {
      console.warn('Direct setlist.fm fetch blocked by CORS, attempting CORS proxy...', directErr);
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      const proxyHeaders = new HttpHeaders({
        'x-api-key': cleanKey,
        'Accept': 'application/json'
      });
      return await firstValueFrom(this.http.get(proxyUrl, { headers: proxyHeaders }));
    }
  }
}
