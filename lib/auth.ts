import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomToken, digest, hashPassword, verifyPassword, safeEqual } from "./password";
import { secureResponse } from "./security";

export type AuthEnv = { DB?: D1Database; APP_ORIGIN?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };
type Session = { token_hash: string; user_id: string | null; csrf_hash: string; expires_at: number };
type User = { id: string; email: string; password_hash: string | null; google_subject: string | null };
type Flow = { state_hash: string; session_hash: string; verifier: string; nonce_hash: string; expires_at: number };
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const now = () => Math.floor(Date.now() / 1000);
const json = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(data, { status, headers });
class AuthError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}
function origin(request: Request, env: AuthEnv) {
  if (env.APP_ORIGIN) {
    const configured = new URL(env.APP_ORIGIN);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname);
    if (configured.protocol !== "https:" && !local) throw new AuthError(503, "Sign-in is temporarily unavailable.");
    return configured.origin;
  }
  const url = new URL(request.url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (loopback) return url.origin;
  throw new AuthError(503, "Sign-in is temporarily unavailable. Please try again later.");
}
function cookieName(request: Request) { return new URL(request.url).protocol === "https:" ? "__Host-WardrobeWish" : "WardrobeWish_local"; }
function sessionCookie(request: Request, token: string, seconds: number) {
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
async function readSession(request: Request, db: D1Database): Promise<Session | null> {
  const name = cookieName(request);
  const token = (request.headers.get("Cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith(name + "="))?.slice(name.length + 1);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db.prepare("SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?").bind(digest(token), now()).first<Session>();
}
function ip(request: Request) {
  // On deployment, CF-Connecting-IP is supplied by the trusted Cloudflare edge.
  // Never trust client-controlled X-Forwarded-For values.
  return request.headers.get("CF-Connecting-IP") || "local";
}
async function limit(db: D1Database, key: string, maximum: number, window = 900) {
  const time = now();
  const row = await db.prepare(`INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
    expires_at = CASE WHEN expires_at <= ? THEN ? ELSE expires_at END RETURNING count, expires_at`)
    .bind(digest(key), time + window, time, time, time + window).first<{ count: number; expires_at: number }>();
  if (!row || row.count > maximum) throw new AuthError(429, "Too many attempts. Please take a break and try again later.", row ? Math.max(1, row.expires_at - time) : window);
}
async function cleanup(db: D1Database) {
  const time = now();
  await db.batch([
    db.prepare("DELETE FROM oauth_flows WHERE state_hash IN (SELECT state_hash FROM oauth_flows WHERE expires_at <= ? LIMIT 100)").bind(time),
    db.prepare("DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at <= ? LIMIT 100)").bind(time),
    db.prepare("DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at <= ? LIMIT 100)").bind(time),
  ]);
}
async function newSession(request: Request, db: D1Database, userId: string | null, previous: Session | null, remember = false) {
  const token = randomToken(), csrf = randomToken();
  const seconds = userId ? (remember ? 30 * 86400 : 12 * 3600) : 3600;
  const statements = [db.prepare("INSERT INTO sessions (token_hash, user_id, csrf_hash, expires_at) VALUES (?, ?, ?, ?)").bind(digest(token), userId, digest(csrf), now() + seconds)];
  if (previous) statements.push(db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(previous.token_hash));
  await db.batch(statements);
  return { csrf, cookie: sessionCookie(request, token, seconds) };
}
async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("Content-Type")?.split(";")[0] !== "application/json") throw new AuthError(415, "Please submit the sign-in form.");
  if (Number(request.headers.get("Content-Length") || 0) > 4096) throw new AuthError(413, "This request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(400, "Please complete the form.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new AuthError(413, "This request is too large."); }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new AuthError(400, "Please check the form and try again."); }
}
function validateCsrf(request: Request, env: AuthEnv, session: Session | null) {
  const token = request.headers.get("X-CSRF-Token") || "";
  if (request.headers.get("Origin") !== origin(request, env) || request.headers.get("Sec-Fetch-Site") === "cross-site" || !session || !/^[A-Za-z0-9_-]{43}$/.test(token) || !safeEqual(digest(token), session.csrf_hash)) {
    throw new AuthError(403, "Your sign-in form has expired. Refresh the page and try again.");
  }
}
function credentials(body: Record<string, unknown>, signup: boolean) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email)) throw new AuthError(400, "Enter a valid email address.");
  if (password.length > 128 || password.length < (signup ? 15 : 1)) throw new AuthError(400, signup ? "Choose a password between 15 and 128 characters." : "Enter your password (up to 128 characters).");
  return { email, password };
}
async function handle(request: Request, env: AuthEnv): Promise<Response> {
  const db = env.DB;
  if (!db) throw new AuthError(503, "Sign-in is temporarily unavailable. Please try again later.");
  const path = new URL(request.url).pathname;
  const session = await readSession(request, db);
  if (request.method === "GET" && path === "/api/auth/session") {
    await limit(db, `bootstrap:${ip(request)}`, 120, 900);
    await cleanup(db);
    const user = session?.user_id ? await db.prepare("SELECT id, email, google_subject FROM users WHERE id = ?").bind(session.user_id).first<User>() : null;
    const csrf = randomToken();
    if (session) {
      await db.prepare("UPDATE sessions SET csrf_hash = ? WHERE token_hash = ?").bind(digest(csrf), session.token_hash).run();
      return json({ csrf, user: user ? { email: user.email, provider: user.google_subject ? "google" : "email" } : null, googleConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) });
    }
    const fresh = await newSession(request, db, null, null);
    return json({ csrf: fresh.csrf, user: null, googleConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) }, 200, { "Set-Cookie": fresh.cookie });
  }
  if (request.method === "GET" && path === "/api/auth/me") {
    if (!session?.user_id) throw new AuthError(401, "Sign in to see your account.");
    const user = await db.prepare("SELECT email, created_at FROM users WHERE id = ?").bind(session.user_id).first();
    if (!user) throw new AuthError(401, "Please sign in again.");
    return json({ user });
  }
  if (request.method === "GET" && path === "/api/auth/google/callback") return googleCallback(request, env, db, session);
  if (request.method !== "POST") throw new AuthError(405, "This action is not available.");
  validateCsrf(request, env, session);
  await limit(db, `write:${ip(request)}`, 45);
  const body = await readJson(request);
  if (path === "/api/auth/logout") {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(session!.token_hash).run();
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(request, "", 0) });
  }
  if (path === "/api/auth/google") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new AuthError(503, "Google sign-in is not connected yet. You can use email to continue.");
    await limit(db, `oauth:${ip(request)}`, 10);
    const state = randomToken(), nonce = randomToken(), verifier = randomToken();
    const challenge = Buffer.from(digest(verifier), "hex").toString("base64url");
    await db.prepare("INSERT INTO oauth_flows (state_hash, session_hash, verifier, nonce_hash, expires_at) VALUES (?, ?, ?, ?, ?)").bind(digest(state), session!.token_hash, verifier, digest(nonce), now() + 600).run();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: origin(request, env) + "/api/auth/google/callback", response_type: "code", scope: "openid email", state, nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" }).toString();
    return json({ url: url.toString() });
  }
  if (path !== "/api/auth/login" && path !== "/api/auth/signup") throw new AuthError(404, "This action is not available.");
  const signup = path.endsWith("/signup");
  const { email, password } = credentials(body, signup);
  await limit(db, `account:${email}`, 10);
  if (signup) await limit(db, `signup:${ip(request)}`, 5, 3600);
  let user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>();
  if (signup) {
    const encoded = await hashPassword(password);
    if (user) throw new AuthError(400, "We couldn't create an account with those details. Try signing in instead.");
    const id = crypto.randomUUID();
    const inserted = await db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING RETURNING id").bind(id, email, encoded, now()).first();
    if (!inserted) throw new AuthError(400, "We couldn't create an account with those details. Try signing in instead.");
    user = { id, email, password_hash: encoded, google_subject: null };
  } else {
    const valid = await verifyPassword(password, user?.password_hash || null);
    if (!valid || !user) throw new AuthError(401, "Email or password isn't right. Please try again.");
  }
  const fresh = await newSession(request, db, user!.id, session, body.remember === true);
  return json({ csrf: fresh.csrf, user: { email: user!.email, provider: "email" } }, signup ? 201 : 200, { "Set-Cookie": fresh.cookie });
}
async function googleCallback(request: Request, env: AuthEnv, db: D1Database, session: Session | null) {
  const failed = () => new Response(null, { status: 303, headers: { Location: "/?auth=google_failed" } });
  try {
    await limit(db, `callback:${ip(request)}`, 20);
    if (!session || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return failed();
    const params = new URL(request.url).searchParams;
    const state = params.get("state") || "", code = params.get("code");
    if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return failed();
    const flow = await db.prepare("DELETE FROM oauth_flows WHERE state_hash = ? AND session_hash = ? AND expires_at > ? RETURNING *").bind(digest(state), session.token_hash, now()).first<Flow>();
    if (!flow || !code || code.length > 4096 || params.has("error")) return failed();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: origin(request, env) + "/api/auth/google/callback", grant_type: "authorization_code", code_verifier: flow.verifier }),
      redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return failed();
    const tokens = await response.json() as { id_token?: string };
    if (!tokens.id_token) return failed();
    const { payload } = await jwtVerify(tokens.id_token, GOOGLE_KEYS, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: env.GOOGLE_CLIENT_ID, algorithms: ["RS256"], maxTokenAge: "10 minutes", requiredClaims: ["sub", "exp", "iat", "email", "email_verified", "nonce"] });
    if (payload.email_verified !== true || typeof payload.email !== "string" || typeof payload.nonce !== "string" || !safeEqual(digest(payload.nonce), flow.nonce_hash) || typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255 || (payload.azp && payload.azp !== env.GOOGLE_CLIENT_ID)) return failed();
    if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== env.GOOGLE_CLIENT_ID) return failed();
    const email = payload.email.toLowerCase();
    if (email.length > 254) return failed();
    let user = await db.prepare("SELECT * FROM users WHERE google_subject = ?").bind(payload.sub).first<User>();
    if (!user) {
      // Never silently link a Google identity to an existing password account.
      const inserted = await db.prepare("INSERT INTO users (id, email, google_subject, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING *").bind(crypto.randomUUID(), email, payload.sub, now()).first<User>();
      user = inserted || await db.prepare("SELECT * FROM users WHERE google_subject = ?").bind(payload.sub).first<User>();
      if (!user) return failed();
    }
    const fresh = await newSession(request, db, user.id, session);
    return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": fresh.cookie } });
  } catch { return failed(); }
}
export async function auth(request: Request, env: AuthEnv) {
  let response: Response;
  try { response = await handle(request, env); }
  catch (error) {
    if (error instanceof AuthError) response = json({ error: error.message }, error.status, error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined);
    else {
      // Do not log request bodies, credentials, OAuth codes, or session tokens.
      console.error("Authentication operation failed", error instanceof Error ? error.name : "UnknownError");
      response = json({ error: "Sign-in is temporarily unavailable. Please try again later." }, 503);
    }
  }
  return secureResponse(response, request);
}
