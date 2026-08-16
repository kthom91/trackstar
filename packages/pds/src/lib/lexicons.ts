/**
 * Standard AT Protocol Collection Names & Lexicons used by TrackStar
 */
export const LEXICONS = {
  LOG: 'app.trackstar.log',
  TEAL_SCROBBLE: 'app.teal.scrobble'
} as const;

export type TrackstarCollection = typeof LEXICONS[keyof typeof LEXICONS];
