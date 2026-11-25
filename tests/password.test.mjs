import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, randomToken } from "../lib/password.ts";
test("equal passwords get independent salts and hashes", async () => {
  const password = "maple clouds violet meadow";
  const one = await hashPassword(password), two = await hashPassword(password);
  assert.notEqual(one, two);
  assert.match(one, /^scrypt\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  assert.equal(one.includes(password), false);
  assert.equal(await verifyPassword(password, one), true);
  assert.equal(await verifyPassword("wrong password", one), false);
});
test("unknown accounts and malformed hashes cannot authenticate", async () => {
  assert.equal(await verifyPassword("anything", null), false);
  assert.equal(await verifyPassword("anything", "corrupt"), false);
});
test("long Unicode passwords are not truncated", async () => {
  const password = "海と森のワードローブ".repeat(7);
  const encoded = await hashPassword(password);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword(password.slice(0, -1) + "x", encoded), false);
});
test("session tokens have 256 bits of entropy", () => {
  const tokens = new Set(Array.from({ length: 100 }, randomToken));
  assert.equal(tokens.size, 100);
  for (const token of tokens) assert.match(token, /^[A-Za-z0-9_-]{43}$/);
});
