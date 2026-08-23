import { describe, it, expect } from 'vitest';
import {
  getParsedMetadata,
  getCoverUrl,
  getSubtitle,
  getTypeIcon
} from './formatters';

describe('Media Formatters', () => {
  it('parses metadataJson correctly whether object or string', () => {
    expect(getParsedMetadata(null)).toEqual({});
    expect(getParsedMetadata({ metadataJson: { author: 'Tolkien' } })).toEqual({ author: 'Tolkien' });
    expect(getParsedMetadata({ metadataJson: '{"director":"Nolan"}' })).toEqual({ director: 'Nolan' });
  });

  it('resolves direct coverUrl and ISBN Open Library fallback', () => {
    expect(getCoverUrl({ metadataJson: { coverUrl: 'https://example.com/poster.jpg' } })).toBe('https://example.com/poster.jpg');
    expect(getCoverUrl({ metadataJson: { isbn: '9780593135204' } })).toBe('https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg');
    expect(getCoverUrl({ id: 'isbn:0593135202', metadataJson: {} })).toBe('https://covers.openlibrary.org/b/isbn/0593135202-M.jpg');
  });

  it('formats subtitle for books, movies, and concerts', () => {
    expect(getSubtitle({ mediaItem: { mediaType: 'book', id: '1', title: 'Dune', metadataJson: { author: 'Frank Herbert' } } })).toBe('by Frank Herbert');
    expect(getSubtitle({ mediaItem: { mediaType: 'movie', id: '2', title: 'Oppenheimer', metadataJson: { director: 'Christopher Nolan' } } })).toBe('dir. Christopher Nolan');
    expect(getSubtitle({ mediaItem: { mediaType: 'movie', id: '3', title: 'Old Movie', metadataJson: { year: 1982 } } })).toBe('(1982)');
    expect(getSubtitle({ mediaItem: { mediaType: 'concert', id: '4', title: 'Live Show', metadataJson: { venue: 'MSG', city: 'New York' } } })).toBe('MSG, New York');
  });

  it('returns type emoji', () => {
    expect(getTypeIcon('book')).toBe('📚');
    expect(getTypeIcon('movie')).toBe('🎬');
    expect(getTypeIcon('concert')).toBe('🎟️');
    expect(getTypeIcon('music')).toBe('🎵');
    expect(getTypeIcon('other')).toBe('🌟');
  });
});
