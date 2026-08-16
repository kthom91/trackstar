import { describe, it, expect } from 'vitest';
import { generateTid, makeRkeySafe } from './tid';

describe('AT Protocol TID & rkey utilities', () => {
  describe('generateTid', () => {
    it('generates a valid AT Protocol timestamp identifier', () => {
      const tid = generateTid();
      expect(tid).toBeDefined();
      expect(typeof tid).toBe('string');
      expect(tid.startsWith('3')).toBe(true);
      expect(tid.length).toBeGreaterThan(5);
    });

    it('generates unique TIDs across consecutive calls', () => {
      const tid1 = generateTid();
      const tid2 = generateTid();
      expect(tid1).not.toBe(tid2);
    });
  });

  describe('makeRkeySafe', () => {
    it('preserves valid alphanumeric and safe chars', () => {
      expect(makeRkeySafe('movie_interstellar_2014')).toBe('movie_interstellar_2014');
      expect(makeRkeySafe('book.dune-part-one~v1')).toBe('book.dune-part-one~v1');
    });

    it('sanitizes spaces and special characters with underscores', () => {
      expect(makeRkeySafe('The Lord of the Rings: The Fellowship')).toBe('The_Lord_of_the_Rings__The_Fellowship');
      expect(makeRkeySafe('Radiohead @ Madison Square Garden!')).toBe('Radiohead___Madison_Square_Garden_');
      expect(makeRkeySafe('🔥 Hot Media 🚀')).toBe('___Hot_Media___');
    });

    it('clips rkeys to max 512 chars', () => {
      const veryLong = 'a'.repeat(600);
      const safe = makeRkeySafe(veryLong);
      expect(safe.length).toBe(512);
    });
  });
});
