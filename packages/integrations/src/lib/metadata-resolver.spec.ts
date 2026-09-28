import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetadataResolver } from './metadata-resolver';

describe('MetadataResolver', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('resolves concert band image from MediaWiki API', async () => {
    const mockWikiResponse = {
      batchcomplete: '',
      query: {
        pages: {
          '38252': {
            pageid: 38252,
            title: 'Radiohead',
            description: 'English rock band',
            extract: 'Radiohead are an English rock band formed in Abingdon...',
            thumbnail: {
              source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/radiohead.jpg/600px-radiohead.jpg',
              width: 600,
              height: 400
            }
          }
        }
      }
    };

    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('en.wikipedia.org')) {
        return {
          ok: true,
          json: async () => mockWikiResponse
        } as any;
      }
      return { ok: false } as any;
    });

    const resolver = new MetadataResolver(() => ({}));
    const result = await resolver.resolveConcertMetadata('Radiohead @ Madison Square Garden');

    expect(result.creator).toBe('Radiohead');
    expect(result.coverUrl).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/radiohead.jpg/600px-radiohead.jpg');
    expect(result.poster_url).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/radiohead.jpg/600px-radiohead.jpg');
    expect(result.description).toBe('English rock band');
    expect(result.externalUrl).toBe('https://en.wikipedia.org/wiki/Radiohead');
  });

  it('resolves concert band image directly from Wikidata via MBID (P434)', async () => {
    const mockWikidataResponse = {
      batchcomplete: '',
      query: {
        pages: {
          '12345': {
            pageid: 12345,
            title: 'Q12345',
            description: 'British rock band',
            thumbnail: {
              source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/coldplay.jpg/600px-coldplay.jpg',
              width: 600,
              height: 400
            }
          }
        }
      }
    };

    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('wikidata.org') && urlStr.includes('haswbstatement:P434=cc197bad-dc9c-440d-a5b5-d52ba2e14234')) {
        return {
          ok: true,
          json: async () => mockWikidataResponse
        } as any;
      }
      return { ok: false } as any;
    });

    const resolver = new MetadataResolver(() => ({}));
    const result = await resolver.resolveConcertMetadata('Coldplay @ Wembley Stadium', 'mbid:cc197bad-dc9c-440d-a5b5-d52ba2e14234');

    expect(result.creator).toBe('Coldplay');
    expect(result.coverUrl).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/coldplay.jpg/600px-coldplay.jpg');
    expect(result.description).toBe('British rock band');
    expect(result.externalUrl).toBe('https://www.wikidata.org/wiki/Q12345');
  });

  it('falls back to Wikipedia search if Wikidata MBID lookup yields no image', async () => {
    const mockWikidataEmpty = {
      batchcomplete: '',
      query: { pages: {} }
    };

    const mockWikiResponse = {
      batchcomplete: '',
      query: {
        pages: {
          '999': {
            pageid: 999,
            title: 'The National (band)',
            description: 'American indie rock band',
            thumbnail: {
              source: 'https://upload.wikimedia.org/wikipedia/commons/the_national.jpg'
            }
          }
        }
      }
    };

    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('wikidata.org')) {
        return {
          ok: true,
          json: async () => mockWikidataEmpty
        } as any;
      }
      if (urlStr.includes('en.wikipedia.org')) {
        return {
          ok: true,
          json: async () => mockWikiResponse
        } as any;
      }
      return { ok: false } as any;
    });

    const resolver = new MetadataResolver(() => ({}));
    const result = await resolver.resolveConcertMetadata('The National', 'mbid:nonexistent-mbid');

    expect(result.creator).toBe('The National');
    expect(result.coverUrl).toBe('https://upload.wikimedia.org/wikipedia/commons/the_national.jpg');
    expect(result.description).toBe('American indie rock band');
  });

  it('handles ambiguous band names by prioritizing musical acts', async () => {
    const mockBandResponse = {
      batchcomplete: '',
      query: {
        pages: {
          '6257091': {
            pageid: 6257091,
            title: 'Justice (band)',
            description: 'French electronic music duo',
            extract: 'Justice are a French electronic music duo...',
            thumbnail: {
              source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/justice.jpg/600px-justice.jpg',
              width: 600,
              height: 400
            }
          }
        }
      }
    };

    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('Justice%20band')) {
        return {
          ok: true,
          json: async () => mockBandResponse
        } as any;
      }
      return { ok: false } as any;
    });

    const resolver = new MetadataResolver(() => ({}));
    const result = await resolver.resolveConcertMetadata('Justice at Brooklyn Mirage');

    expect(result.creator).toBe('Justice');
    expect(result.coverUrl).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/justice.jpg/600px-justice.jpg');
    expect(result.description).toBe('French electronic music duo');
  });

  it('gracefully returns artist name when Wikipedia lookup fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const resolver = new MetadataResolver(() => ({}));
    const result = await resolver.resolveConcertMetadata('Unknown Garage Band @ Local Bar');

    expect(result.creator).toBe('Unknown Garage Band');
    expect(result.coverUrl).toBeUndefined();
  });
});
