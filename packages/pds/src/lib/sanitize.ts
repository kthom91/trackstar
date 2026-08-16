/**
 * Recursively sanitizes any JavaScript value or object so that it is strictly
 * compliant with the AT Protocol Data Model (IPLD DAG-CBOR).
 *
 * In AT Protocol:
 * - Floating point numbers (non-integers like 7.9) are NOT supported in the data model.
 * - Allowed types: null, boolean, integer, string, bytes, cid, array, object.
 * - Undefined, NaN, Infinity, functions, and symbols are invalid.
 */
export function sanitizeAtprotoRecord<T = any>(val: T): T {
  if (val === undefined) {
    return undefined as any;
  }
  if (val === null) {
    return null as any;
  }

  // Numbers: ATProto only allows integers in the 64-bit integer range.
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      return undefined as any;
    }
    if (Number.isInteger(val)) {
      return val;
    }
    // Convert float to string (e.g. 7.9 -> "7.9") so precision is preserved without violating ATProto Data Model
    return String(val) as any;
  }

  // Primitives
  if (typeof val === 'string' || typeof val === 'boolean') {
    return val;
  }

  // Arrays
  if (Array.isArray(val)) {
    return val
      .map(item => sanitizeAtprotoRecord(item))
      .filter(item => item !== undefined) as any;
  }

  // Objects
  if (typeof val === 'object') {
    // Check if it's Uint8Array or Buffer (binary bytes allowed in ATProto)
    if (val instanceof Uint8Array) {
      return val;
    }

    const cleaned: Record<string, any> = {};
    for (const [key, propVal] of Object.entries(val)) {
      // Omit keys with undefined values
      if (propVal === undefined) continue;
      const sanitized = sanitizeAtprotoRecord(propVal);
      if (sanitized !== undefined) {
        cleaned[key] = sanitized;
      }
    }
    return cleaned as any;
  }

  // Default fallback for unrecognized types
  return undefined as any;
}

/**
 * Ensures rating is a valid integer between 1 and 5 (or undefined if missing/unrated).
 */
export function sanitizeRating(rating: any): number | undefined {
  if (rating === undefined || rating === null || rating === '' || rating === 0) {
    return undefined;
  }
  const parsed = Number(rating);
  if (isNaN(parsed) || !Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(1, Math.min(5, Math.round(parsed)));
}
