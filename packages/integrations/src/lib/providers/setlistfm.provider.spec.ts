import { describe, it, expect, vi } from 'vitest';
import { SetlistFmProvider, SetlistFmApiEvent } from './setlistfm.provider';

describe('SetlistFmProvider', () => {
  const provider = new SetlistFmProvider();

  it('normalizes Setlist.fm concert events into UnifiedMediaEntry', () => {
    const rawEvent: SetlistFmApiEvent = {
      id: '3bd6a8b4',
      eventDate: '23-08-2023',
      artist: {
        name: 'The National',
        mbid: 'mbid-national'
      },
      venue: {
        name: 'Madison Square Garden',
        city: {
          name: 'New York',
          country: {
            name: 'United States',
            code: 'US'
          }
        }
      },
      tour: {
        name: 'First Two Pages of Frankenstein Tour'
      },
      url: 'https://www.setlist.fm/setlist/the-national/2023/madison-square-garden-new-york-ny-3bd6a8b4.html'
    };

    const entry = provider.normalizeEvent(rawEvent);

    expect(entry.title).toBe('The National at Madison Square Garden');
    expect(entry.mediaType).toBe('concert');
    expect(entry.status).toBe('completed');
    expect(entry.completedAt).toBeDefined();
    expect(entry.externalId).toBe('3bd6a8b4');
    expect(entry.metadata.artist).toBe('The National');
    expect(entry.metadata.venue).toBe('Madison Square Garden');
    expect(entry.metadata.city).toBe('New York');
    expect(entry.metadata.year).toBe('2023');
    expect(entry.metadata.tour).toBe('First Two Pages of Frankenstein Tour');
  });

  it('fetches attended concerts with authorization header', async () => {
    const mockApiResponse = {
      type: 'setlists',
      itemsPerPage: 20,
      page: 1,
      total: 1,
      setlist: []
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    const res = await provider.fetchAttendedPage('testuser', 'api-key-123', 1);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.setlist.fm/rest/1.0/user/testuser/attended?p=1',
      expect.objectContaining({
        headers: {
          'Accept': 'application/json',
          'x-api-key': 'api-key-123'
        }
      })
    );

    expect(res.total).toBe(1);
  });
});
