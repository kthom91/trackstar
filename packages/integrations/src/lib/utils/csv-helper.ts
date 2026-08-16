import * as Papa from 'papaparse';

export interface RawCsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Robust CSV parser wrapper supporting both browser File instances and raw CSV string content.
 */
export function parseRawCsv(content: string | File): Promise<RawCsvParseResult> {
  return new Promise((resolve, reject) => {
    if (typeof content === 'string') {
      Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({ headers, rows: results.data });
        },
        error: (err: Error) => reject(err)
      });
    } else {
      Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({ headers, rows: results.data });
        },
        error: (err: Error) => reject(err)
      });
    }
  });
}
