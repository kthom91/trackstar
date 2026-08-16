import { describe, it, expect } from 'vitest';
import { sanitizeAtprotoRecord, sanitizeRating } from './sanitize';

describe('sanitizeAtprotoRecord', () => {
  it('converts floating point numbers to string to conform with ATProto Data Model', () => {
    const input = {
      tmdb_id: 123,
      vote_average: 7.9,
      popularity: 45.67,
      year: 2024,
      title: 'Inception'
    };

    const sanitized = sanitizeAtprotoRecord(input);

    expect(sanitized).toEqual({
      tmdb_id: 123,
      vote_average: '7.9',
      popularity: '45.67',
      year: 2024,
      title: 'Inception'
    });
    // Integer is preserved as number
    expect(typeof sanitized.tmdb_id).toBe('number');
    expect(typeof sanitized.year).toBe('number');
    // Float is converted to string
    expect(typeof sanitized.vote_average).toBe('string');
  });

  it('handles deeply nested objects and arrays with floats', () => {
    const input = {
      record: {
        metadataJson: {
          vote_average: 7.9,
          scores: [8.5, 9, 10.2]
        }
      }
    };

    const sanitized = sanitizeAtprotoRecord(input);

    expect(sanitized).toEqual({
      record: {
        metadataJson: {
          vote_average: '7.9',
          scores: ['8.5', 9, '10.2']
        }
      }
    });
  });

  it('removes undefined and non-serializable fields', () => {
    const input = {
      title: 'Test',
      emptyVal: undefined,
      func: () => {},
      validNull: null,
      validBool: true
    };

    const sanitized = sanitizeAtprotoRecord(input);

    expect(sanitized).toEqual({
      title: 'Test',
      validNull: null,
      validBool: true
    });
    expect('emptyVal' in sanitized).toBe(false);
    expect('func' in sanitized).toBe(false);
  });
});

describe('sanitizeRating', () => {
  it('normalizes ratings to integers between 1 and 5', () => {
    expect(sanitizeRating(4.5)).toBe(5);
    expect(sanitizeRating(3.2)).toBe(3);
    expect(sanitizeRating('4')).toBe(4);
    expect(sanitizeRating(0)).toBeUndefined();
    expect(sanitizeRating(undefined)).toBeUndefined();
    expect(sanitizeRating(null)).toBeUndefined();
    expect(sanitizeRating(6)).toBe(5);
    expect(sanitizeRating(-1)).toBe(1);
  });
});
