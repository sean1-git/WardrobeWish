import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_ORIGIN || "http://127.0.0.1:8787";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Run destructive fixture tests only against a local database.");
let cookie = "", csrf = "";
const email = `security-${Date.now()}@example.test`;
const password = "violet clouds with green shoes";
async function request(path, method = "GET", body, extra = {}) {
  const headers = { Cookie: cookie, ...(method === "POST" ? { Origin: base, "Content-Type": "application/json", "X-CSRF-Token": csrf } : {}), ...extra };
  const response = await fetch(base + path, { method, headers, redirect: "manual", body: body === undefined ? undefined : JSON.stringify(body) });
  // Drain every response before reusing connections, including negative tests.
  return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
}
async function bootstrap() {
  const response = await request("/api/auth/session");
  assert.equal(response.status, 200);
  if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
  const result = await response.json(); csrf = result.csrf; return result;
}
test("authentication security integration", async (t) => {
  await t.test("anonymous account access is denied", async () => assert.equal((await request("/api/auth/me")).status, 401));
  await t.test("HTML blocks inline scripts, framing, and MIME sniffing", async () => {
    const response = await request("/"); assert.equal(response.status, 200);
    assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
    assert.doesNotMatch(response.headers.get("content-security-policy"), /unsafe-inline|unsafe-eval/);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
  await t.test("anonymous session uses HttpOnly SameSite cookies", async () => {
    const response = await request("/api/auth/session");
    assert.equal(response.status, 200);
    const header = response.headers.get("set-cookie");
    assert.match(header, /^WardrobeWish_local=[A-Za-z0-9_-]{43};/);
    assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/);
    cookie = header.split(";")[0]; csrf = (await response.json()).csrf;
  });
  await t.test("missing and invalid CSRF tokens fail", async () => {
    for (const token of ["", "a".repeat(43)]) assert.equal((await request("/api/auth/signup", "POST", { email, password }, { "X-CSRF-Token": token })).status, 403);
  });
  await t.test("cross-origin and missing-origin requests fail", async () => {
    for (const Origin of ["https://attacker.test", ""]) assert.equal((await request("/api/auth/signup", "POST", { email, password }, { Origin })).status, 403);
  });
  await t.test("HTML and SQL injection attempts never authenticate", async () => {
    assert.equal((await request("/api/auth/login", "POST", { email: "' OR 1=1 --", password })).status, 400);
    assert.equal((await request("/api/auth/login", "POST", { email: "x'--@example.test", password })).status, 401);
    const response = await request("/api/auth/signup", "POST", { email: '<img src=x onerror=alert(1)>@example.test', password });
    assert.equal(response.status, 400); assert.doesNotMatch(await response.text(), /<img/);
  });
  await t.test("weak passwords, oversized payloads, and form content types fail", async () => {
    assert.equal((await request("/api/auth/signup", "POST", { email, password: "short" })).status, 400);
    assert.equal((await request("/api/auth/signup", "POST", { email, password: "x".repeat(5000) })).status, 413);
    assert.equal((await request("/api/auth/login", "POST", { email, password }, { "Content-Type": "text/plain" })).status, 415);
  });
  await t.test("signup persists an account and rotates the session", async () => {
    const oldCookie = cookie;
    const response = await request("/api/auth/signup", "POST", { email, password });
    assert.equal(response.status, 201, await response.clone().text());
    cookie = response.headers.get("set-cookie").split(";")[0];
    assert.notEqual(cookie, oldCookie);
    const data = await response.json(); csrf = data.csrf; assert.equal(data.user.email, email);
    assert.equal((await request("/api/auth/me", "GET", undefined, { Cookie: oldCookie })).status, 401);
    assert.equal((await request("/api/auth/me")).status, 200);
  });
  await t.test("logout revokes server session, including copied cookies", async () => {
    assert.equal((await request("/api/auth/logout", "POST", {})).status, 200);
    assert.equal((await request("/api/auth/me")).status, 401); cookie = ""; await bootstrap();
  });
  await t.test("wrong passwords and unknown accounts return the same message", async () => {
    const known = await request("/api/auth/login", "POST", { email, password: "wrong" });
    const unknown = await request("/api/auth/login", "POST", { email: `missing-${Date.now()}@example.test`, password: "wrong" });
    assert.equal(known.status, 401); assert.equal(unknown.status, 401); assert.deepEqual(await known.json(), await unknown.json());
  });
  await t.test("remembered login persists across bootstrap", async () => {
    const response = await request("/api/auth/login", "POST", { email: email.toUpperCase(), password, remember: true });
    assert.equal(response.status, 200); assert.match(response.headers.get("set-cookie"), /Max-Age=2592000/);
    cookie = response.headers.get("set-cookie").split(";")[0]; csrf = (await response.json()).csrf;
    assert.equal((await bootstrap()).user.email, email);
    await request("/api/auth/logout", "POST", {}); cookie = ""; await bootstrap();
  });
  await t.test("Google fails closed without credentials; forged callback fails", async () => {
    assert.equal((await request("/api/auth/google", "POST", {})).status, 503);
    const response = await request("/api/auth/google/callback?state=forged&code=forged");
    assert.equal(response.status, 303); assert.equal(response.headers.get("location"), "/?auth=google_failed");
    assert.equal((await request("/api/auth/me")).status, 401);
  });
  await t.test("concurrent password guesses are atomically limited", async () => {
    const target = `limited-${Date.now()}@example.test`;
    const results = await Promise.all(Array.from({ length: 12 }, () => request("/api/auth/login", "POST", { email: target, password: "wrong" })));
    assert.equal(results.filter(r => r.status === 401).length, 10);
    const blocked = results.filter(r => r.status === 429); assert.equal(blocked.length, 2);
    for (const response of blocked) assert.ok(Number(response.headers.get("retry-after")) > 0);
  });
});
