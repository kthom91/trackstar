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
}

// Convenient export functions
export const registry = IntegrationRegistry.getInstance();
export const getAllProviders = () => registry.getAll();
export const getProvider = (id: string) => registry.get(id);
export const detectProviderForCsv = (headers: string[], filename?: string) => registry.detectProviderForCsv(headers, filename);
export const parseCsvAuto = (content: string | File, options?: CsvParseOptions) => registry.parseCsvAuto(content, options);
