import { describe, it, expect } from 'vitest';
import {
  IntegrationRegistry,
  getAllProviders,
  getProvider,
  detectProviderForCsv
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
});
