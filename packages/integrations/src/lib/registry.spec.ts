import { describe, it, expect } from 'vitest';
import {
  IntegrationRegistry,
  getAllProviders,
  getProvider,
  detectProviderForCsv,
  registry,
  getItemExternalUrl
} from './registry';

describe('IntegrationRegistry', () => {
  it('registers all default providers', () => {
    const providers = getAllProviders();
    const ids = providers.map(p => p.id);

    expect(ids).toContain('letterboxd');
    expect(ids).toContain('storygraph');
    expect(ids).toContain('goodreads');
    expect(ids).toContain('setlistfm');
    expect(ids).toContain('teal');
  });

  it('retrieves provider by ID', () => {
    const lb = getProvider('letterboxd');
    expect(lb).toBeDefined();
    expect(lb?.name).toBe('Letterboxd');
    expect(lb?.mediaType).toBe('movie');
  });

  it('filters providers by category and capability', () => {
    const registry = IntegrationRegistry.getInstance();
    const bookProviders = registry.getByCategory('book');
    expect(bookProviders.length).toBeGreaterThanOrEqual(2);
    expect(bookProviders.map(p => p.id)).toContain('storygraph');
    expect(bookProviders.map(p => p.id)).toContain('goodreads');

    const csvImporters = registry.getByCapability('csv_import');
    expect(csvImporters.map(p => p.id)).toContain('letterboxd');
    expect(csvImporters.map(p => p.id)).toContain('storygraph');
    expect(csvImporters.map(p => p.id)).toContain('goodreads');
  });

  it('auto-detects Letterboxd from headers or filename', () => {
    const headers = ['Date', 'Name', 'Year', 'Letterboxd URI', 'Rating', 'Rewatch', 'Tags', 'Watched Date'];
    const detected = detectProviderForCsv(headers, 'diary.csv');
    expect(detected?.id).toBe('letterboxd');
  });

  it('auto-detects StoryGraph from headers', () => {
    const headers = ['Title', 'Authors', 'ISBN/UID', 'Read Status', 'Star Rating', 'Review', 'Last Date Read'];
    const detected = detectProviderForCsv(headers, 'my_export.csv');
    expect(detected?.id).toBe('storygraph');
  });

  it('auto-detects Goodreads from headers', () => {
    const headers = ['Book Id', 'Title', 'Author', 'Author l-f', 'ISBN', 'ISBN13', 'My Rating', 'Exclusive Shelf', 'Date Read'];
    const detected = detectProviderForCsv(headers, 'goodreads_library_export.csv');
    expect(detected?.id).toBe('goodreads');
  });

  describe('getItemExternalUrl', () => {
    it('resolves Letterboxd URL by source and metadata', () => {
      const url = registry.getItemExternalUrl({
        title: 'Dune: Part Two',
        source: 'letterboxd',
        mediaType: 'movie',
        metadata: { letterboxd_url: 'https://boxd.it/test1' }
      });
      expect(url).toBe('https://boxd.it/test1');
    });

    it('resolves Goodreads search URL by ISBN', () => {
      const url = registry.getItemExternalUrl({
        title: 'Project Hail Mary',
        source: 'goodreads',
        mediaType: 'book',
        metadata: { isbn: '9780593135204' }
      });
      expect(url).toBe('https://www.goodreads.com/search?q=9780593135204');
    });

    it('resolves StoryGraph search URL by title when no ISBN', () => {
      const url = registry.getItemExternalUrl({
        title: 'Klara and the Sun',
        source: 'storygraph',
        mediaType: 'book'
      });
      expect(url).toBe('https://app.thestorygraph.com/browse?search_term=Klara%20and%20the%20Sun');
    });

    it('resolves Setlist.fm concert URL from externalId', () => {
      const url = registry.getItemExternalUrl({
        title: 'The National at MSG',
        source: 'setlistfm',
        mediaType: 'concert',
        externalId: '3bd6a8b4'
      });
      expect(url).toBe('https://www.setlist.fm/setlist/3bd6a8b4.html');
    });

    it('resolves Teal track URL from Spotify ID', () => {
      const url = registry.getItemExternalUrl({
        title: 'Weird Fishes — Radiohead',
        source: 'teal',
        mediaType: 'music',
        metadata: { spotifyId: 'spotify:track:4wajJ1peHTMlMjyqAxPt0J' }
      });
      expect(url).toBe('https://open.spotify.com/track/4wajJ1peHTMlMjyqAxPt0J');
    });

    it('falls back to mediaType default provider search when source is unknown', () => {
      const url = registry.getItemExternalUrl({
        title: 'Arrival',
        mediaType: 'movie'
      });
      expect(url).toBe('https://letterboxd.com/search/Arrival/');
    });
  });
});
