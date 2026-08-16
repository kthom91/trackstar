import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EnrichedMetadata, AutocompleteItem } from '@trackstar/data';

export type { EnrichedMetadata, AutocompleteItem };

const TMDB_KEY_STORAGE = 'trackstar_tmdb_api_key';
const LASTFM_KEY_STORAGE = 'trackstar_lastfm_api_key';

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

  // Last.fm API Key
  getLastfmApiKey(): string {
    return localStorage.getItem(LASTFM_KEY_STORAGE) || '';
  }

  setLastfmApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(LASTFM_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(LASTFM_KEY_STORAGE);
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

  // Helper to extract high quality image from Last.fm image array
  private extractLastfmImage(images: any[]): string | undefined {
    if (!images || !Array.isArray(images) || images.length === 0) return undefined;
    const preferredSizes = ['mega', 'extralarge', 'large', 'medium', 'small'];
    for (const size of preferredSizes) {
      const match = images.find((img: any) => img.size === size && img['#text']);
      if (match && match['#text']) {
        const url = match['#text'].trim();
        if (url && !url.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          return url;
        }
      }
    }
    for (const img of images) {
      if (img && img['#text'] && !img['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f')) {
        return img['#text'].trim();
      }
    }
    return undefined;
  }

  // Concerts: Last.fm Artist Autocomplete (with MusicBrainz fallback)
  async searchConcertsAutocomplete(query: string): Promise<AutocompleteItem[]> {
    const cleanQ = this.extractArtistName(query.trim());
    if (!cleanQ) return [];

    const apiKey = this.getLastfmApiKey();

    // 1. If Last.fm API Key is configured, search Last.fm
    if (apiKey) {
      try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(cleanQ)}&api_key=${apiKey}&format=json&limit=6`;
        const res: any = await firstValueFrom(this.http.get(url));

        const matches = res?.results?.artistmatches?.artist;
        if (matches) {
          const list = Array.isArray(matches) ? matches : [matches];
          return list.slice(0, 6).map((a: any) => {
            const cover = this.extractLastfmImage(a.image);
            const listeners = a.listeners ? `${Number(a.listeners).toLocaleString()} listeners` : 'Artist';
            return {
              id: a.mbid ? `mbid:${a.mbid}` : `lastfm:${a.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
              title: a.name,
              creator: a.name,
              coverUrl: cover,
              description: listeners,
              mediaType: 'concert' as const,
              metadataJson: {
                artist: a.name,
                creator: a.name,
                coverUrl: cover,
                poster_url: cover,
                listeners: a.listeners,
                mbid: a.mbid || undefined,
                lastfm_url: a.url
              }
            };
          });
        }
      } catch (err) {
        console.warn('Last.fm artist autocomplete search failed, trying MusicBrainz fallback:', err);
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
            mbid: a.id
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

  // 3. Concerts: Last.fm Metadata Resolver
  async resolveConcertMetadata(title: string, hintId?: string): Promise<EnrichedMetadata> {
    const cleanArtist = this.extractArtistName(title);
    if (!cleanArtist) {
      return { creator: title };
    }

    const apiKey = this.getLastfmApiKey();
    if (apiKey) {
      try {
        let artistUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(cleanArtist)}&api_key=${apiKey}&format=json&autocorrect=1`;
        if (hintId && (hintId.startsWith('mbid:') || hintId.startsWith('musicbrainz:'))) {
          const mbid = hintId.replace(/^(mbid|musicbrainz):/, '').trim();
          artistUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&mbid=${encodeURIComponent(mbid)}&api_key=${apiKey}&format=json`;
        }

        const res: any = await firstValueFrom(this.http.get(artistUrl));
        if (res && res.artist) {
          const artist = res.artist;
          let coverUrl = this.extractLastfmImage(artist.image);

          // If artist image is absent or placeholder, fetch top album cover as visual artwork
          if (!coverUrl) {
            try {
              const albumUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(artist.name || cleanArtist)}&api_key=${apiKey}&format=json&limit=1`;
              const albumRes: any = await firstValueFrom(this.http.get(albumUrl));
              const topAlbum = albumRes?.topalbums?.album?.[0] || albumRes?.topalbums?.album;
              if (topAlbum?.image) {
                coverUrl = this.extractLastfmImage(topAlbum.image);
              }
            } catch {
              // Ignore album fetch errors
            }
          }

          let genres: string[] | undefined = undefined;
          if (artist.tags?.tag) {
            const tags = Array.isArray(artist.tags.tag) ? artist.tags.tag : [artist.tags.tag];
            genres = tags.map((t: any) => t.name).filter(Boolean).slice(0, 3);
          }

          let bioSummary: string | undefined = undefined;
          if (artist.bio?.summary) {
            bioSummary = artist.bio.summary.replace(/<a[\s\S]*$/i, '').trim();
          }

          return {
            creator: artist.name || cleanArtist,
            coverUrl: coverUrl,
            poster_url: coverUrl,
            description: bioSummary || undefined,
            genres: genres,
            externalUrl: artist.url
          };
        }
      } catch (err) {
        console.warn('Last.fm concert metadata lookup failed:', err);
      }
    }

    return {
      creator: cleanArtist
    };
  }
}
