import { describe, it, expect } from 'vitest';
import { GoodreadsProvider } from './goodreads.provider';

describe('GoodreadsProvider', () => {
  const provider = new GoodreadsProvider();

  it('matches Goodreads export headers', () => {
    expect(provider.matchesCsvHeader(['Book Id', 'Title', 'Author', 'Exclusive Shelf', 'My Rating'])).toBe(true);
  });

  it('parses Goodreads CSV and cleans ISBNs and quotes', async () => {
    const csvContent = `Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review
12345,Project Hail Mary,Andy Weir,"Weir, Andy",,="0593135202",="9780593135204",5,4.51,Ballantine Books,Hardcover,496,2021,2021,2021/05/10,2021/05/01,,,read,"Loved Rocky!"
67890,The Three-Body Problem,Cixin Liu,"Liu, Cixin",,="0765382032",="9780765382030",0,4.08,Tor Books,Paperback,399,2014,2006,,2022/01/01,,,to-read,
11223,Dune Messiah,Frank Herbert,"Herbert, Frank",,,,3,3.90,Ace,Paperback,336,1987,1969,,2023/06/01,,,currently-reading,`;

    const result = await provider.parseCsv(csvContent);

    expect(result.entries.length).toBe(3);
    expect(result.errors.length).toBe(0);

    const hailMary = result.entries[0];
    expect(hailMary.title).toBe('Project Hail Mary');
    expect(hailMary.mediaType).toBe('book');
    expect(hailMary.status).toBe('completed');
    expect(hailMary.rating).toBe(5);
    expect(hailMary.review).toBe('Loved Rocky!');
    expect(hailMary.metadata.author).toBe('Andy Weir');
    expect(hailMary.metadata.isbn).toBe('9780593135204'); // cleaned from ="9780593135204"
    expect(hailMary.metadata.pages).toBe('496');

    const threeBody = result.entries[1];
    expect(threeBody.title).toBe('The Three-Body Problem');
    expect(threeBody.status).toBe('want_to_consume');
    expect(threeBody.rating).toBeUndefined(); // 0 rating means unrated

    const duneMessiah = result.entries[2];
    expect(duneMessiah.title).toBe('Dune Messiah');
    expect(duneMessiah.status).toBe('consuming');
    expect(duneMessiah.rating).toBe(3);
  });
});
