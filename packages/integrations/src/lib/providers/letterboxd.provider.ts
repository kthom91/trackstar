import {
  IntegrationProvider,
  NormalizedMediaEntry,
  ParsedIntegrationResult,
  CsvParseOptions
} from '../types';
import { parseRawCsv } from '../utils/csv-helper';

export class LetterboxdProvider implements IntegrationProvider {
  readonly id = 'letterboxd';
  readonly name = 'Letterboxd';
  readonly description = 'Sync film diary, watched history, and watchlists from Letterboxd.';
  readonly category = 'movie';
  readonly mediaType = 'movie';
  readonly accentColor = '#00e054';
  readonly avatarText = 'LB';
  readonly exportGuideUrl = 'https://letterboxd.com/settings/data/';
  readonly exportGuideLabel = 'Settings > Data Export ↗';
  readonly exportInstructions = 'Upload your diary.csv, watched.csv, or watchlist.csv export file.';
  readonly capabilities = ['csv_import', 'rss_sync', 'extension_sync', 'export_csv'] as const;
  readonly acceptedFileExtensions = ['.csv'];

  matchesCsvHeader(headers: string[], filename = ''): boolean {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('letterboxd') || lowerName.includes('diary.csv') || lowerName.includes('watched.csv') || lowerName.includes('watchlist.csv')) {
      return true;
    }
    const lowerHeaders = headers.map(h => h.toLowerCase());
    return lowerHeaders.includes('letterboxd uri') || (lowerHeaders.includes('name') && lowerHeaders.includes('year') && (lowerHeaders.includes('rating') || lowerHeaders.includes('watched date')));
  }

  async parseCsv(content: string | File, options?: CsvParseOptions): Promise<ParsedIntegrationResult> {
    const filename = options?.filename || (typeof content !== 'string' && content.name ? content.name : '');
    const isWatchlist = filename.toLowerCase().includes('watchlist');
    const { rows } = await parseRawCsv(content);

    const entries: NormalizedMediaEntry[] = [];
    const errors: { item?: string; error: string; raw?: any }[] = [];

    let processed = 0;
    for (const row of rows) {
      try {
        const title = row['Name'] || row['Title'] || row['name'] || row['title'] || '';
        if (!title.trim()) continue;

        const year = row['Year'] || row['year'] || '';
        const letterboxdUri = row['Letterboxd URI'] || row['letterboxd uri'] || row['URI'] || '';
        const rawRating = row['Rating'] || row['rating'] || row['Rating10'] || '';
        
        let rating: number | undefined;
        if (rawRating) {
          const parsed = parseFloat(rawRating);
          if (!isNaN(parsed) && parsed > 0) {
            // If on a 10-scale, normalize to 1-5, otherwise keep 1-5 scale
            rating = parsed > 5 ? Math.round(parsed / 2) : Math.round(parsed);
            if (rating < 1) rating = 1;
            if (rating > 5) rating = 5;
          }
        }

        const rawDate = row['Watched Date'] || row['watched date'] || row['Date'] || row['date'] || undefined;
        let completedAt: string | undefined;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            completedAt = d.toISOString();
          }
        }

        const review = row['Review'] || row['review'] || undefined;
        const tagsRaw = row['Tags'] || row['tags'] || '';
        const tags = tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined;

        const status = isWatchlist ? 'want_to_consume' : (options?.defaultStatus || 'completed');

        entries.push({
          mediaType: 'movie',
          title: title.trim(),
          status,
          rating,
          review,
          completedAt,
          loggedAt: completedAt || new Date().toISOString(),
          source: 'letterboxd',
          externalId: letterboxdUri || undefined,
          externalUrl: letterboxdUri || undefined,
          tags,
          metadata: {
            year,
            letterboxd_url: letterboxdUri,
            tags,
            source: 'letterboxd'
          }
        });
      } catch (err: any) {
        errors.push({
          item: row['Name'] || row['Title'] || 'Unknown Entry',
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

  async parseRss(xmlText: string): Promise<ParsedIntegrationResult> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(xmlDoc.querySelectorAll('item'));

    const entries: NormalizedMediaEntry[] = [];
    const errors: { item?: string; error: string }[] = [];

    for (const item of items) {
      try {
        const link = item.querySelector('link')?.textContent || '';
        const filmTitle = item.querySelector('letterboxd\\:filmTitle, filmTitle')?.textContent || '';
        const filmYear = item.querySelector('letterboxd\\:filmYear, filmYear')?.textContent || '';
        const watchedDateRaw = item.querySelector('letterboxd\\:watchedDate, watchedDate')?.textContent || '';
        const memberRatingRaw = item.querySelector('letterboxd\\:memberRating, memberRating')?.textContent || '';

        // Extract title fallback
        const titleRaw = item.querySelector('title')?.textContent || '';
        const title = filmTitle || titleRaw.split(',')[0].replace(/\s-\s★.*$/, '').trim();
        if (!title) continue;

        let rating: number | undefined;
        if (memberRatingRaw) {
          const parsed = parseFloat(memberRatingRaw);
          if (!isNaN(parsed)) rating = Math.round(parsed);
        }

        let completedAt: string | undefined;
        if (watchedDateRaw) {
          const d = new Date(watchedDateRaw);
          if (!isNaN(d.getTime())) completedAt = d.toISOString();
        }

        // Cover poster from description HTML
        let coverUrl: string | undefined;
        const description = item.querySelector('description')?.textContent || '';
        const imgMatch = description.match(/src=["'](https:\/\/[^"']+\.jpg|https:\/\/[^"']+\.png)["']/i);
        if (imgMatch) {
          coverUrl = imgMatch[1];
        }

        entries.push({
          mediaType: 'movie',
          title: title.trim(),
          status: 'completed',
          rating,
          completedAt,
          loggedAt: completedAt || new Date().toISOString(),
          source: 'letterboxd',
          externalId: link || undefined,
          externalUrl: link || undefined,
          metadata: {
            year: filmYear,
            coverUrl,
            letterboxd_url: link,
            source: 'letterboxd'
          }
        });
      } catch (err: any) {
        errors.push({
          item: item.querySelector('title')?.textContent || 'Unknown Item',
          error: err.message || String(err)
        });
      }
    }

    return {
      providerId: this.id,
      sourceName: this.name,
      total: items.length,
      entries,
      errors
    };
  }
}
