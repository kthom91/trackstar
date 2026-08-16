/**
 * Generates an AT Protocol Timestamp Identifier (TID)
 * Format: 3 + base32(microseconds) + 3 random base32 digits
 */
export function generateTid(): string {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `3${now.toString(36)}${rand}`;
}

/**
 * Sanitizes any arbitrary text into a valid AT Protocol Record Key (rkey).
 * Must contain only [a-zA-Z0-9.\-_~] and max length 512.
 */
export function makeRkeySafe(text: string): string {
  return text.replace(/[^a-zA-Z0-9.\-_~]/g, '_').slice(0, 512);
}
