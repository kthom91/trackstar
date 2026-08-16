import { describe, it, expect } from 'vitest';
import { StoryGraphProvider } from './storygraph.provider';

describe('StoryGraphProvider', () => {
  const provider = new StoryGraphProvider();

  it('matches StoryGraph headers', () => {
    expect(provider.matchesCsvHeader(['Title', 'Authors', 'ISBN/UID', 'Read Status'])).toBe(true);
  });

  it('parses StoryGraph books with different read statuses', async () => {
    const csvContent = `Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,Last Date Read,Star Rating,Review,Tags
Tomorrow and Tomorrow and Tomorrow,Gabrielle Zevin,,9780593321201,hardcover,read,2023-01-01,2023-01-15,4.75,"Amazing book!","fiction, games"
Demon Copperhead,Barbara Kingsolver,,9780063251922,audiobook,currently-reading,2023-02-01,,4.0,"In progress","southern"
Klara and the Sun,Kazuo Ishiguro,,9780593318171,paperback,to-read,2023-03-01,,,,`;

    const result = await provider.parseCsv(csvContent);

    expect(result.entries.length).toBe(3);
    expect(result.errors.length).toBe(0);

    const book1 = result.entries[0];
    expect(book1.title).toBe('Tomorrow and Tomorrow and Tomorrow');
    expect(book1.mediaType).toBe('book');
    expect(book1.status).toBe('completed');
    expect(book1.rating).toBe(5); // 4.75 rounded
    expect(book1.metadata.author).toBe('Gabrielle Zevin');
    expect(book1.metadata.isbn).toBe('9780593321201');
    expect(book1.review).toBe('Amazing book!');

    const book2 = result.entries[1];
    expect(book2.title).toBe('Demon Copperhead');
    expect(book2.status).toBe('consuming');

    const book3 = result.entries[2];
    expect(book3.title).toBe('Klara and the Sun');
    expect(book3.status).toBe('want_to_consume');
  });
});
