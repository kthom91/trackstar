import { PdsUserLog } from './pds.models';

/**
 * Safely parse metadata whether it is stored as an object or a JSON string.
 */
export function getParsedMetadata(item?: { metadata?: any; metadataJson?: any; mediaItem?: { metadataJson?: any } } | null): Record<string, any> {
  if (!item) return {};
  const raw = item.metadata ?? item.metadataJson ?? item.mediaItem?.metadataJson;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

/**
 * Resolves the primary cover or poster image URL with fallback to Open Library for ISBNs.
 */
export function getCoverUrl(item?: { id?: string; mediaItemId?: string; metadata?: any; metadataJson?: any; mediaItem?: { id?: string; metadataJson?: any } } | null): string | null {
  if (!item) return null;
  const meta = getParsedMetadata(item);

  const direct =
    meta['coverUrl'] ||
    meta['cover_url'] ||
    meta['poster_url'] ||
    meta['posterUrl'] ||
    meta['image_url'] ||
    meta['artist_image'] ||
    (item as any)?.['coverUrl'] ||
    (item as any)?.mediaItem?.['coverUrl'];

  if (direct) return direct;

  const id = item.mediaItemId || item.mediaItem?.id || item.id || '';
  if (id.startsWith('isbn:')) {
    const cleanIsbn = id.replace('isbn:', '').replace(/[^0-9X]/gi, '');
    if (cleanIsbn.length >= 10) {
      return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;
    }
  }

  if (meta['isbn'] || meta['isbn13']) {
    const cleanIsbn = String(meta['isbn13'] || meta['isbn']).replace(/[^0-9X]/gi, '');
    if (cleanIsbn.length >= 10) {
      return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;
    }
  }

  return null;
}

/**
 * Returns formatted subtitle (e.g. "by Author", "dir. Director (Year)", or "Venue, City").
 */
export function getSubtitle(item?: { title?: string; mediaType?: string; metadata?: any; metadataJson?: any; mediaItem?: any } | null): string | null {
  if (!item) return null;
  const meta = getParsedMetadata(item);
  const type = item.mediaType || item.mediaItem?.mediaType || 'book';

  if (type === 'book') {
    const author = meta['creator'] || meta['author'];
    return author ? `by ${author}` : null;
  }

  if (type === 'movie' || type === 'film') {
    const director = meta['creator'] || meta['director'];
    if (director) return `dir. ${director}`;
    if (meta['year']) return `(${meta['year']})`;
    return null;
  }

  if (type === 'concert' || type === 'live') {
    const venue = meta['venue'] || '';
    const city = meta['city'] || '';
    return [venue, city].filter(Boolean).join(', ') || null;
  }

  if (type === 'music' || type === 'track') {
    const artist = meta['artist'];
    const album = meta['album'];
    return [artist, album].filter(Boolean).join(' • ') || null;
  }

  return null;
}

/**
 * Returns visual emoji identifier for a given media type.
 */
export function getTypeIcon(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'book':
      return '📚';
    case 'movie':
    case 'film':
      return '🎬';
    case 'concert':
    case 'live':
      return '🎟️';
    case 'music':
    case 'track':
      return '🎵';
    default:
      return '🌟';
  }
}
