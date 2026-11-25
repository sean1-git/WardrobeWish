import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

// OWASP's scrypt profile: N=2^14, r=8, p=5 (16 MiB memory, parallelism 5).
const N = 16384, r = 8, p = 5;
const derive = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 32, { N, r, p, maxmem: 32 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export const randomToken = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string | null) {
  const parts = encoded?.split("$");
  const valid = parts?.length === 6 && parts[0] === "scrypt" && parts[1] === String(N) && parts[2] === String(r) && parts[3] === String(p) && /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{64}$/.test(parts[5]);
  // Always do the expensive derivation, including unknown accounts and Google accounts.
  const salt = valid ? Buffer.from(parts![4], "hex") : Buffer.alloc(16, 1);
  const actual = await derive(password, salt);
  const expected = valid ? Buffer.from(parts![5], "hex") : Buffer.alloc(32);
  const matches = timingSafeEqual(actual, expected);
  return Boolean(valid && matches);
}
