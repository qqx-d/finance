import type { User } from "./types.ts";

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  const value = username.trim();
  return value.length >= 3 && value.length <= 32 && /^[\p{L}\p{N}._-]+$/u.test(value);
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const normalizedSalt = Uint8Array.from(salt);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: normalizedSalt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return bytesToBase64(new Uint8Array(bits));
}

export async function createPasswordCredentials(password: string): Promise<{ passwordHash: string; passwordSalt: string }> {
  const salt = randomBytes(16);
  return {
    passwordHash: await hashPassword(password, salt),
    passwordSalt: bytesToBase64(salt),
  };
}

export async function verifyPassword(password: string, user: User): Promise<boolean> {
  const salt = base64ToBytes(user.passwordSalt);
  const hash = await hashPassword(password, salt);
  return hash === user.passwordHash;
}

export function createSessionToken(): string {
  return Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, "0")).join("");
}