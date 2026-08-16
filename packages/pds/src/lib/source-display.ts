export const SOURCE_DISPLAY_NAMES: Record<string, string> = {
    storygraph: 'StoryGraph',
    goodreads: 'Goodreads',
    letterboxd: 'Letterboxd',
    'letterboxd_rss': 'Letterboxd',
    'letterboxd_1click_export': 'Letterboxd',
    lastfm: 'Last.fm',
    'last.fm': 'Last.fm',
    setlist: 'Setlist.fm',
    setlistfm: 'Setlist.fm',
    'setlist.fm': 'Setlist.fm',
    teal: 'Teal',
    trackstar: 'TrackStar',
    tmdb: 'TMDB',
    musicbrainz: 'MusicBrainz',
    openlibrary: 'Open Library'
};

export function getSourceDisplayName(source?: string | null, fallbackMediaType?: string): string {
    const raw = (source ?? '').toString().trim();
    if (raw) {
        const normalized = raw.toLowerCase();

        if (SOURCE_DISPLAY_NAMES[normalized]) {
            return SOURCE_DISPLAY_NAMES[normalized];
        }

        for (const [key, displayName] of Object.entries(SOURCE_DISPLAY_NAMES)) {
            if (normalized.includes(key)) {
                return displayName;
            }
        }
    }

    switch (fallbackMediaType) {
        case 'book':
            return 'StoryGraph';
        case 'movie':
            return 'Letterboxd';
        case 'concert':
            return 'Last.fm';
        default:
            return 'External Provider';
    }
}

export function getPdsLogSourceDisplayName(log?: { source?: string; mediaItem?: { metadataJson?: Record<string, any>; mediaType?: string } } | null): string {
    const rawSource = log?.source ?? log?.mediaItem?.metadataJson?.['source'];
    return getSourceDisplayName(rawSource, log?.mediaItem?.mediaType);
}
