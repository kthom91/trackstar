import {
  IntegrationProvider,
  NormalizedMediaEntry
} from '../types';

export interface TealScrobbleRecord {
  trackName: string;
  artistName: string;
  albumName?: string;
  playedAt?: string;
  durationMs?: number;
  musicBrainzId?: string;
  spotifyId?: string;
  isrc?: string;
}

export class TealProvider implements IntegrationProvider {
  readonly id = 'teal';
  readonly name = 'Teal.fm';
  readonly description = 'Decentralized music scrobbling on the AT Protocol (Authenticated Transfer).';
  readonly category = 'music';
  readonly mediaType = 'music';
  readonly accentColor = '#06b6d4';
  readonly avatarText = 'TL';
  readonly exportGuideUrl = 'https://teal.fm';
  readonly exportGuideLabel = 'teal.fm ↗';
  readonly exportInstructions = 'Sync live track scrobbles and listening history directly via your AT Protocol PDS.';
  readonly capabilities = ['api_sync', 'extension_sync'] as const;

  /**
   * Normalize an AT Protocol Teal scrobble record into a unified media entry.
   */
  normalizeScrobble(scrobble: TealScrobbleRecord): NormalizedMediaEntry {
    const title = `${scrobble.trackName} — ${scrobble.artistName}`;
    const completedAt = scrobble.playedAt ? new Date(scrobble.playedAt).toISOString() : new Date().toISOString();

    return {
      mediaType: 'music',
      title,
      status: 'completed',
      completedAt,
      loggedAt: completedAt,
      source: 'teal',
      externalId: scrobble.musicBrainzId || scrobble.spotifyId || undefined,
      metadata: {
        track: scrobble.trackName,
        artist: scrobble.artistName,
        album: scrobble.albumName,
        duration_ms: scrobble.durationMs,
        source: 'teal'
      }
    };
  }
}
