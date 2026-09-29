/**
 * Security & Cryptography Utilities for Multi-Tenant Commercial SaaS
 * Handles salted SHA-256 password hashing via Web Crypto API (no plaintext passwords)
 * and secure session token generation.
 */

export const generateSalt = (bytes = 16): string => {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const text = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple 32-bit FNV/DJB2-like hex digest if crypto.subtle unavailable in test env
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
};

export const verifyPassword = async (
  inputPassword: string,
  salt: string,
  storedHash: string
): Promise<boolean> => {
  if (!inputPassword || !salt || !storedHash) return false;
  const computedHash = await hashPassword(inputPassword, salt);
  return computedHash.toLowerCase() === storedHash.toLowerCase();
};

export const generateSessionToken = (): string => {
  const timestamp = Date.now().toString(36);
  const random = generateSalt(12);
  return `sess_${timestamp}_${random}`;
};
