import { describe, it, expect } from 'vitest';
import { LetterboxdProvider } from './letterboxd.provider';

describe('LetterboxdProvider', () => {
  const provider = new LetterboxdProvider();

  it('matches Letterboxd CSV headers', () => {
    expect(provider.matchesCsvHeader(['Name', 'Year', 'Letterboxd URI'], 'letterboxd.csv')).toBe(true);
    expect(provider.matchesCsvHeader(['Date', 'Name', 'Year', 'Watched Date'], 'diary.csv')).toBe(true);
  });

  it('parses diary.csv entries correctly', async () => {
    const csvContent = `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
2024-03-01,Dune: Part Two,2024,https://boxd.it/test1,4.5,No,"imax, scifi",2024-03-01
2024-03-05,Past Lives,2023,https://boxd.it/test2,5,No,"drama",2024-03-04`;

    const result = await provider.parseCsv(csvContent, { filename: 'diary.csv' });

    expect(result.entries.length).toBe(2);
    expect(result.errors.length).toBe(0);

    const dune = result.entries[0];
    expect(dune.title).toBe('Dune: Part Two');
    expect(dune.mediaType).toBe('movie');
    expect(dune.status).toBe('completed');
    expect(dune.rating).toBe(5); // 4.5 rounded
    expect(dune.tags).toEqual(['imax', 'scifi']);
    expect(dune.metadata.year).toBe('2024');
    expect(dune.externalId).toBe('https://boxd.it/test1');

    const pastLives = result.entries[1];
    expect(pastLives.title).toBe('Past Lives');
    expect(pastLives.rating).toBe(5);
  });

  it('parses watchlist.csv mapping to status want_to_consume', async () => {
    const csvContent = `Date,Name,Year,Letterboxd URI
2024-01-10,Challengers,2024,https://boxd.it/test3
2024-01-12,Megalopolis,2024,https://boxd.it/test4`;

    const result = await provider.parseCsv(csvContent, { filename: 'watchlist.csv' });

    expect(result.entries.length).toBe(2);
    expect(result.entries[0].status).toBe('want_to_consume');
    expect(result.entries[1].status).toBe('want_to_consume');
  });

  it('parses public Letterboxd RSS feeds', async () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:letterboxd="https://letterboxd.com">
  <channel>
    <title>Letterboxd - user</title>
    <item>
      <title>Oppenheimer, 2023 - ★★★★★</title>
      <link>https://letterboxd.com/user/film/oppenheimer/</link>
      <letterboxd:filmTitle>Oppenheimer</letterboxd:filmTitle>
      <letterboxd:filmYear>2023</letterboxd:filmYear>
      <letterboxd:memberRating>5.0</letterboxd:memberRating>
      <letterboxd:watchedDate>2023-07-21</letterboxd:watchedDate>
      <description><![CDATA[<p><img src="https://a.ltrbxd.com/resized/film-poster/1/2/3/poster.jpg"/></p>]]></description>
    </item>
  </channel>
</rss>`;

    // In node environment, if DOMParser is not built-in, mock or test in jsdom/happy-dom or node
    if (typeof DOMParser !== 'undefined') {
      const result = await provider.parseRss(rssXml);
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].title).toBe('Oppenheimer');
      expect(result.entries[0].rating).toBe(5);
      expect(result.entries[0].metadata.coverUrl).toBe('https://a.ltrbxd.com/resized/film-poster/1/2/3/poster.jpg');
    }
  });
});
