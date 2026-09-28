import { EnrichedMetadata, AutocompleteItem } from '@trackstar/data';

export interface MetadataApiKeys {
  tmdbApiKey?: string;
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

  /**
   * Resolves concert artist metadata and band image.
   * Tier 1: Direct Wikidata query by MusicBrainz ID (P434) if mbid is provided.
   * Tier 2: Streamlined Wikipedia search fallback by artist name.
   */
  async resolveConcertMetadata(title: string, hintId?: string): Promise<EnrichedMetadata> {
    const cleanArtist = this.extractArtistName(title);
    if (!cleanArtist) {
      return { creator: title };
    }

    let creator = cleanArtist;
    let coverUrl: string | undefined = undefined;
    let description: string | undefined = undefined;
    let genres: string[] | undefined = undefined;
    let wikipediaUrl: string | undefined = undefined;
    let wikidataUrl: string | undefined = undefined;

    const headers = {
      'Api-User-Agent': 'TrackStar/1.0 (https://github.com/kthom91/trackstar; contact@trackstar.local)',
      'User-Agent': 'TrackStar/1.0 (https://github.com/kthom91/trackstar; contact@trackstar.local)'
    };

    // Extract MBID if present in hintId
    let mbid: string | undefined = undefined;
    if (hintId && (hintId.startsWith('mbid:') || hintId.startsWith('musicbrainz:'))) {
      mbid = hintId.replace(/^(mbid|musicbrainz):/, '').trim();
    }

    // Tier 1: Direct Wikidata query by MusicBrainz Artist ID (P434)
    if (mbid) {
      try {
        const wikidataUrlQuery = `https://www.wikidata.org/w/api.php?action=query&generator=search&gsrsearch=haswbstatement:P434=${encodeURIComponent(mbid)}&prop=pageimages|description&pithumbsize=600&format=json&origin=*`;
        const res = await fetch(wikidataUrlQuery, { headers });
        if (res.ok) {
          const data = await res.json();
          const pages: any[] = Object.values(data?.query?.pages || {});
          const match = pages.find((p: any) => p.thumbnail?.source);
          if (match) {
            coverUrl = match.thumbnail.source;
            if (match.description) description = match.description;
            if (match.title) wikidataUrl = `https://www.wikidata.org/wiki/${match.title}`;
          }
        }
      } catch (err) {
        console.warn('Wikidata MBID lookup failed, falling back to Wikipedia name search:', err);
      }
    }

    // Tier 2: Streamlined Wikipedia search fallback by artist name
    if (!coverUrl) {
      try {
        const searchWiki = async (q: string) => {
          const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=pageimages|description|extracts&exintro=1&explaintext=1&exsentences=2&pithumbsize=600&format=json&origin=*`;
          const res = await fetch(url, { headers });
          if (!res.ok) return null;
          const data = await res.json();
          const pages: any[] = Object.values(data?.query?.pages || {}).sort((a: any, b: any) => a.index - b.index);
          return pages.find((p: any) => p.thumbnail?.source) || null;
        };

        // Try '${cleanArtist} band' first to resolve ambiguous acts (e.g. Justice, Phoenix), then direct '${cleanArtist}'
        const match = (await searchWiki(`${cleanArtist} band`)) || (await searchWiki(cleanArtist));
        if (match) {
          coverUrl = match.thumbnail?.source;
          description = match.description || match.extract;
          if (match.title) {
            creator = match.title.replace(/\s*\(.*?\)$/, '').trim();
            wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(match.title.replace(/\s+/g, '_'))}`;
          }
        }
      } catch (err) {
        console.warn('Wikipedia artist lookup failed:', err);
      }
    }

    return {
      creator: creator,
      coverUrl: coverUrl,
      poster_url: coverUrl,
      description: description,
      genres: genres,
      wikipedia_url: wikipediaUrl,
      wikidata_url: wikidataUrl
    };
  }
}
