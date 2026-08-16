import { describe, it, expect } from 'vitest';
import { TealProvider, TealScrobbleRecord } from './teal.provider';

describe('TealProvider', () => {
  const provider = new TealProvider();

  it('normalizes AT Protocol Teal scrobble record', () => {
    const scrobble: TealScrobbleRecord = {
      trackName: 'Weird Fishes/Arpeggi',
      artistName: 'Radiohead',
      albumName: 'In Rainbows',
      playedAt: '2024-05-01T15:30:00Z',
      durationMs: 318000,
      spotifyId: 'spotify:track:4wajJ1peHTMlMjyqAxPt0J'
    };

    const entry = provider.normalizeScrobble(scrobble);

    expect(entry.title).toBe('Weird Fishes/Arpeggi — Radiohead');
    expect(entry.mediaType).toBe('music');
    expect(entry.status).toBe('completed');
    expect(entry.completedAt).toBe('2024-05-01T15:30:00.000Z');
    expect(entry.externalId).toBe('spotify:track:4wajJ1peHTMlMjyqAxPt0J');
    expect(entry.metadata.artist).toBe('Radiohead');
    expect(entry.metadata.album).toBe('In Rainbows');
    expect(entry.metadata.duration_ms).toBe(318000);
  });
});
