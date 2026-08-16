import { EnrichedMetadata, AutocompleteItem } from '@trackstar/data';

export interface MetadataApiKeys {
  tmdbApiKey?: string;
  lastfmApiKey?: string;
}

export class MetadataResolver {
  constructor(private getKeys: () => MetadataApiKeys) {}

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

  private cache = new Map<string, EnrichedMetadata>();

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

  // 1. Books: Open Library API
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
      const res = await fetch(searchUrl);
      if (res.ok) {
        const searchData = await res.json();
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
      }
    } catch (err) {
      console.warn('Open Library metadata lookup failed:', err);
    }
    return {};
  }

  // 2. Movies: TMDB API
  async resolveMovieMetadata(title: string, tmdbHint?: string): Promise<EnrichedMetadata> {
    const keys = this.getKeys();
    const apiKey = keys.tmdbApiKey;
    if (!apiKey) return {};

    try {
      if (tmdbHint && tmdbHint.startsWith('tmdb:')) {
        const tmdbId = tmdbHint.replace('tmdb:', '').trim();
        if (tmdbId && !isNaN(Number(tmdbId))) {
          const directUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`;
          const res = await fetch(directUrl);
          if (res.ok) {
            const movie = await res.json();
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
      }

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

      let res = await fetch(searchUrl);
      let data = res.ok ? await res.json() : null;

      if ((!data || !data.results || data.results.length === 0) && searchYear) {
        const broadUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&include_adult=false`;
        res = await fetch(broadUrl);
        data = res.ok ? await res.json() : null;
      }

      if (data && data.results && data.results.length > 0) {
        const movie = data.results[0];
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

    const keys = this.getKeys();
    const apiKey = keys.lastfmApiKey;
    if (apiKey) {
      try {
        let artistUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(cleanArtist)}&api_key=${apiKey}&format=json&autocorrect=1`;
        if (hintId && (hintId.startsWith('mbid:') || hintId.startsWith('musicbrainz:'))) {
          const mbid = hintId.replace(/^(mbid|musicbrainz):/, '').trim();
          artistUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&mbid=${encodeURIComponent(mbid)}&api_key=${apiKey}&format=json`;
        }

        const res = await fetch(artistUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.artist) {
            const artist = data.artist;
            const coverUrl = this.extractLastfmImage(artist.image);

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
