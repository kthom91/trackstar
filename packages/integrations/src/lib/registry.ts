import {
  IntegrationProvider,
  IntegrationCategory,
  ParsedIntegrationResult,
  CsvParseOptions
} from './types';
import { LetterboxdProvider } from './providers/letterboxd.provider';
import { StoryGraphProvider } from './providers/storygraph.provider';
import { GoodreadsProvider } from './providers/goodreads.provider';
import { SetlistFmProvider } from './providers/setlistfm.provider';
import { TealProvider } from './providers/teal.provider';
import { parseRawCsv } from './utils/csv-helper';

export class IntegrationRegistry {
  private static instance: IntegrationRegistry;
  private providers = new Map<string, IntegrationProvider>();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  private registerDefaults(): void {
    this.register(new LetterboxdProvider());
    this.register(new StoryGraphProvider());
    this.register(new GoodreadsProvider());
    this.register(new SetlistFmProvider());
    this.register(new TealProvider());
  }

  register(provider: IntegrationProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): IntegrationProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): IntegrationProvider[] {
    return Array.from(this.providers.values());
  }

  getByCategory(category: IntegrationCategory): IntegrationProvider[] {
    return this.getAll().filter(p => p.category === category);
  }

  getByCapability(capability: string): IntegrationProvider[] {
    return this.getAll().filter(p => (p.capabilities as readonly string[]).includes(capability));
  }

  /**
   * Automatically detect which provider can parse a given CSV file based on its headers and filename.
   */
  detectProviderForCsv(headers: string[], filename = ''): IntegrationProvider | undefined {
    for (const provider of this.getAll()) {
      if (provider.matchesCsvHeader && provider.matchesCsvHeader(headers, filename)) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * Auto-detect and parse any supported CSV export file (StoryGraph, Letterboxd, Goodreads, etc.)
   */
  async parseCsvAuto(content: string | File, options?: CsvParseOptions): Promise<ParsedIntegrationResult> {
    const filename = options?.filename || (typeof content !== 'string' && content.name ? content.name : '');
    const { headers } = await parseRawCsv(content);

    const provider = this.detectProviderForCsv(headers, filename);
    if (!provider || !provider.parseCsv) {
      throw new Error(`Unsupported CSV format. Could not match headers to any known provider: ${headers.slice(0, 5).join(', ')}`);
    }

    return await provider.parseCsv(content, options);
  }

  /**
   * Get the default canonical provider for a given media type.
   */
  getDefaultProviderForMediaType(mediaType?: string): IntegrationProvider | undefined {
    if (!mediaType) return undefined;
    const normalized = mediaType.toLowerCase();
    switch (normalized) {
      case 'movie':
      case 'film':
        return this.get('letterboxd');
      case 'book':
        return this.get('storygraph') || this.get('goodreads');
      case 'concert':
      case 'live':
        return this.get('setlistfm');
      case 'music':
      case 'track':
        return this.get('teal');
      default:
        return undefined;
    }
  }

  /**
   * Resolve the canonical external web URL for any media log or entry.
   */
  getItemExternalUrl(item: {
    title?: string;
    source?: string;
    mediaType?: string;
    metadata?: Record<string, any>;
    externalId?: string;
    externalUrl?: string;
  }): string {
    const title = item.title || '';
    const meta = item.metadata || {};

    const externalId = item.externalId || meta['isbn'] || meta['isbn13'] || meta['id'] || meta['musicBrainzId'] || meta['spotifyId'];
    const externalUrl =
      item.externalUrl ||
      meta['url'] ||
      meta['externalUrl'] ||
      meta['letterboxd_url'] ||
      meta['setlist_url'] ||
      meta['storygraph_url'] ||
      meta['goodreads_url'] ||
      meta['teal_url'] ||
      meta['link'];

    // 1. Try matching by explicit source
    if (item.source) {
      const provider = this.get(item.source.toLowerCase());
      if (provider && provider.getItemUrl) {
        const url = provider.getItemUrl({
          title,
          externalId,
          externalUrl,
          metadata: meta
        });
        if (url) return url;
      }
    }

    // 2. Try default provider by mediaType
    const defaultProvider = this.getDefaultProviderForMediaType(item.mediaType);
    if (defaultProvider && defaultProvider.getItemUrl) {
      const url = defaultProvider.getItemUrl({
        title,
        externalId,
        externalUrl,
        metadata: meta
      });
      if (url) return url;
    }

    // 3. Last fallback: metadata direct url or hash
    return externalUrl || '#';
  }
}

// Convenient export functions
export const registry = IntegrationRegistry.getInstance();
export const getAllProviders = () => registry.getAll();
export const getProvider = (id: string) => registry.get(id);
export const detectProviderForCsv = (headers: string[], filename?: string) => registry.detectProviderForCsv(headers, filename);
export const parseCsvAuto = (content: string | File, options?: CsvParseOptions) => registry.parseCsvAuto(content, options);
export const getDefaultProviderForMediaType = (mediaType?: string) => registry.getDefaultProviderForMediaType(mediaType);
export const getItemExternalUrl = (item: {
  title?: string;
  source?: string;
  mediaType?: string;
  metadata?: Record<string, any>;
  externalId?: string;
  externalUrl?: string;
}) => registry.getItemExternalUrl(item);

