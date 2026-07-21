import { hash, verify } from "@node-rs/argon2";

// Argon2id with parameters within OWASP recommended range for interactive login.
const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(
  storedHash: string | null,
  plain: string,
): Promise<boolean> {
  if (!storedHash) return false;
  return verify(storedHash, plain);
}
