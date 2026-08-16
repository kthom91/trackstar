import {
  IntegrationProvider,
  NormalizedMediaEntry,
  ParsedIntegrationResult
} from '../types';

export interface SetlistFmApiEvent {
  id: string;
  versionId?: string;
  eventDate: string; // "DD-MM-YYYY"
  artist?: {
    name: string;
    mbid?: string;
  };
  venue?: {
    name: string;
    city?: {
      name: string;
      country?: {
        name: string;
        code: string;
      };
    };
  };
  tour?: {
    name: string;
  };
  url?: string;
  info?: string;
}

export interface SetlistFmApiResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist?: SetlistFmApiEvent[];
}

export class SetlistFmProvider implements IntegrationProvider {
  readonly id = 'setlistfm';
  readonly name = 'setlist.fm';
  readonly description = 'Synchronize live concert attendance history and setlists via setlist.fm REST API.';
  readonly category = 'concert';
  readonly mediaType = 'concert';
  readonly accentColor = '#f59e0b';
  readonly avatarText = 'SF';
  readonly exportGuideUrl = 'https://www.setlist.fm/settings/api';
  readonly exportGuideLabel = 'setlist.fm > API Settings ↗';
  readonly exportInstructions = 'Enter your setlist.fm username and API key in the extension or sync panel to sync your attended shows.';
  readonly capabilities = ['api_sync', 'extension_sync'] as const;

  /**
   * Normalize a raw setlist.fm API concert entry into a unified media entry.
   */
  normalizeEvent(event: SetlistFmApiEvent): NormalizedMediaEntry {
    const artistName = event.artist?.name || 'Unknown Artist';
    const venueName = event.venue?.name || 'Live Event';
    const cityName = event.venue?.city?.name || '';
    const countryName = event.venue?.city?.country?.name || '';

    // Title format: "Artist at Venue"
    const title = `${artistName} at ${venueName}`.trim();

    // Parse DD-MM-YYYY to ISO string
    let completedAt: string | undefined;
    let year: string | undefined;
    if (event.eventDate) {
      const parts = event.eventDate.split('-');
      if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        year = parts[2];
        const d = new Date(`${year}-${month}-${day}T20:00:00Z`);
        if (!isNaN(d.getTime())) {
          completedAt = d.toISOString();
        }
      }
    }

    const setlistUrl = event.url || `https://www.setlist.fm/setlist/${event.id}.html`;

    return {
      mediaType: 'concert',
      title,
      status: 'completed',
      completedAt,
      loggedAt: completedAt || new Date().toISOString(),
      source: 'setlistfm',
      externalId: event.id,
      externalUrl: setlistUrl,
      metadata: {
        artist: artistName,
        venue: venueName,
        city: cityName,
        country: countryName,
        year,
        setlist_url: setlistUrl,
        tour: event.tour?.name,
        source: 'setlistfm'
      }
    };
  }

  /**
   * Client helper to fetch a paginated list of attended concerts from setlist.fm API.
   */
  async fetchAttendedPage(
    userId: string,
    apiKey: string,
    page = 1
  ): Promise<SetlistFmApiResponse> {
    const url = `https://api.setlist.fm/rest/1.0/user/${encodeURIComponent(userId.trim())}/attended?p=${page}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey.trim()
      }
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`setlist.fm API Error ${res.status}: ${errorText || res.statusText}`);
    }

    return await res.json();
  }
}
