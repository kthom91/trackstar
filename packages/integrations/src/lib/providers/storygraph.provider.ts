import {
  IntegrationProvider,
  NormalizedMediaEntry,
  ParsedIntegrationResult,
  CsvParseOptions,
  LogStatus
} from '../types';
import { parseRawCsv } from '../utils/csv-helper';

export class StoryGraphProvider implements IntegrationProvider {
  readonly id = 'storygraph';
  readonly name = 'StoryGraph';
  readonly description = 'Import reading history, reviews, and to-read book shelves from StoryGraph.';
  readonly category = 'book';
  readonly mediaType = 'book';
  readonly accentColor = '#3b82f6';
  readonly avatarText = 'SG';
  readonly exportGuideUrl = 'https://app.thestorygraph.com/export';
  readonly exportGuideLabel = 'Settings > Manage Account > Export Data ↗';
  readonly exportInstructions = 'Download your StoryGraph user data export (.csv) and upload here.';
  readonly capabilities = ['csv_import', 'extension_sync', 'export_csv'] as const;
  readonly acceptedFileExtensions = ['.csv'];

  matchesCsvHeader(headers: string[], filename = ''): boolean {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('storygraph') || lowerName.includes('story_graph')) {
      return true;
    }
    const lowerHeaders = headers.map(h => h.toLowerCase());
    return lowerHeaders.includes('read status') || (lowerHeaders.includes('isbn/uid') && lowerHeaders.includes('authors'));
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

        const author = row['Authors'] || row['Author'] || row['authors'] || row['author'] || '';
        const isbn = row['ISBN/UID'] || row['isbn'] || row['ISBN'] || '';
        const statusRaw = (row['Read Status'] || row['status'] || '').toLowerCase();

        let status: LogStatus = 'completed';
        if (statusRaw.includes('to-read') || statusRaw.includes('wishlist') || statusRaw.includes('plan')) {
          status = 'want_to_consume';
        } else if (statusRaw.includes('currently-reading') || statusRaw.includes('reading') || statusRaw.includes('in-progress')) {
          status = 'consuming';
        }

        const rawRating = row['Star Rating'] || row['Rating'] || row['rating'] || '';
        let rating: number | undefined;
        if (rawRating) {
          const parsed = parseFloat(rawRating);
          if (!isNaN(parsed) && parsed > 0) {
            rating = Math.round(parsed);
            if (rating < 1) rating = 1;
            if (rating > 5) rating = 5;
          }
        }

        const review = row['Review'] || row['review'] || undefined;
        const rawDate = row['Last Date Read'] || row['Date Added'] || row['Date Read'] || undefined;
        let completedAt: string | undefined;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            completedAt = d.toISOString();
          }
        }

        const tagsRaw = row['Tags'] || row['tags'] || row['Moods'] || '';
        const tags = tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined;

        entries.push({
          mediaType: 'book',
          title: title.trim(),
          status,
          rating,
          review,
          completedAt,
          loggedAt: completedAt || new Date().toISOString(),
          source: 'storygraph',
          externalId: isbn || undefined,
          tags,
          metadata: {
            author,
            isbn,
            tags,
            source: 'storygraph'
          }
        });
      } catch (err: any) {
        errors.push({
          item: row['Title'] || 'Unknown Book',
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
