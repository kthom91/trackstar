import { describe, it, expect } from 'vitest';
import { LEXICONS } from './lexicons';

describe('Lexicon constants', () => {
  it('contains valid AT Protocol collection identifiers for TrackStar', () => {
    expect(LEXICONS.MEDIA).toBe('app.trackstar.media');
    expect(LEXICONS.LOG).toBe('app.trackstar.log');
    expect(LEXICONS.TEAL_SCROBBLE).toBe('app.teal.scrobble');
  });
});
