import {
  IntegrationProvider,
  NormalizedMediaEntry,
  ParsedIntegrationResult,
  CsvParseOptions,
  LogStatus,
  ItemUrlContext
} from '../types';
import { parseRawCsv } from '../utils/csv-helper';

export class GoodreadsProvider implements IntegrationProvider {
  readonly id = 'goodreads';
  readonly name = 'Goodreads';
  readonly description = 'Import your Goodreads reading library, custom shelves, star ratings, and reviews.';
  readonly category = 'book';
  readonly mediaType = 'book';
  readonly accentColor = '#7a4e2d';
  readonly avatarText = 'GR';
  readonly exportGuideUrl = 'https://www.goodreads.com/review/import';
  readonly exportGuideLabel = 'Goodreads > Export Library ↗';
  readonly exportInstructions = 'Go to Goodreads > My Books > Import and Export > Export Library and upload the generated CSV file.';
  readonly capabilities = ['csv_import', 'export_csv'] as const;
  readonly acceptedFileExtensions = ['.csv'];

  getItemUrl(context: ItemUrlContext): string {
    const meta = context.metadata || {};
    if (context.externalUrl) return context.externalUrl;
    if (meta['goodreads_url']) return meta['goodreads_url'];
    if (meta['url'] && typeof meta['url'] === 'string' && meta['url'].includes('goodreads')) return meta['url'];

    const isbn = meta['isbn'] || meta['isbn13'] || context.externalId;
    if (isbn && typeof isbn === 'string' && /^[0-9X]{10,13}$/i.test(isbn.trim())) {
      return `https://www.goodreads.com/search?q=${encodeURIComponent(isbn.trim())}`;
    }

    const cleanTitle = (context.title || '').trim();
    return `https://www.goodreads.com/search?q=${encodeURIComponent(cleanTitle)}`;
  }

  matchesCsvHeader(headers: string[], filename = ''): boolean {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('goodreads')) {
      return true;
    }
    const lowerHeaders = headers.map(h => h.toLowerCase());
    return (lowerHeaders.includes('book id') && lowerHeaders.includes('exclusive shelf')) || (lowerHeaders.includes('author l-f') && lowerHeaders.includes('my rating'));
  }

  async parseCsv(content: string | File, options?: CsvParseOptions): Promise<ParsedIntegrationResult> {
    const { rows } = await parseRawCsv(content);

    const entries: NormalizedMediaEntry[] = [];
    const errors: { item?: string; error: string; raw?: any }[] = [];

    let processed = 0;
    for (const row of rows) {
      try {
        const title = row['Title'] || row['title'] || '';
        if (!title.trim()) continue;

        const author = row['Author'] || row['author'] || row['Author l-f'] || '';
        
        // Clean ISBN / ISBN13 (Goodreads often wraps like =""0123456789"")
        let isbn = row['ISBN13'] || row['ISBN'] || row['isbn13'] || row['isbn'] || '';
        isbn = isbn.replace(/[^0-9X]/gi, '').trim();

        const shelf = (row['Exclusive Shelf'] || row['Bookshelves'] || '').toLowerCase();
        let status: LogStatus = 'completed';
        if (shelf.includes('to-read')) {
          status = 'want_to_consume';
        } else if (shelf.includes('currently-reading')) {
          status = 'consuming';
        }

        const rawRating = row['My Rating'] || row['Rating'] || '';
        let rating: number | undefined;
        if (rawRating) {
          const parsed = parseFloat(rawRating);
          if (!isNaN(parsed) && parsed > 0) {
            rating = Math.round(parsed);
            if (rating < 1) rating = 1;
            if (rating > 5) rating = 5;
          }
        }

        const review = row['My Review'] || row['Review'] || undefined;
        const dateRead = row['Date Read'] || row['Date Added'] || undefined;
        let completedAt: string | undefined;
        if (dateRead) {
          const d = new Date(dateRead);
          if (!isNaN(d.getTime())) {
            completedAt = d.toISOString();
          }
        }

        const yearPublished = row['Year Published'] || row['Original Publication Year'] || '';
        const pages = row['Number of Pages'] || undefined;

        entries.push({
          mediaType: 'book',
          title: title.trim(),
          status,
          rating,
          review,
          completedAt,
          loggedAt: completedAt || new Date().toISOString(),
          source: 'goodreads',
          externalId: isbn || undefined,
          metadata: {
            author,
            isbn,
            year: yearPublished,
            pages,
            source: 'goodreads'
          }
        });
      } catch (err: any) {
        errors.push({
          item: row['Title'] || 'Unknown Goodreads Book',
          error: err.message || String(err),
          raw: row
        });
      } finally {
        processed++;
        options?.onProgress?.(processed, rows.length);
      }
    }

    return {
      providerId: this.id,
      sourceName: this.name,
      total: rows.length,
      entries,
      errors
    };
  }
}
