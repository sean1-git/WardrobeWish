# WardrobeWish

A responsive WardrobeWish fashion landing page with a full-screen model showcase and a light-brown WW monogram and wordmark centered at the top. A small Sign in button opens an accessible account dialog; authentication forms are hidden on initial arrival. The existing email, Google, signup, and account controls remain available inside the dialog. The showcase pauses while the account or privacy dialog is open and resumes when it closes. Google callback errors open the account dialog so the error remains visible.

Six individual model cutouts take turns in a soft spotlight on a stationary studio backdrop. Each model glides in from the left and deeper inside the screen for 1.2 seconds, holds centered for 3.6 seconds, then moves toward the viewer and exits to the right for 1.2 seconds. Translation-only CSS perspective carries each model from Z=-420px to the stage at Z=0, then outward to Z=420px. Six staggered animations create an automatic 36-second loop with one visible model at a time. The transparent cutouts stay facing forward and are individually centered and aligned at the feet. There is no rotation, fading, or animation control. Reduced-motion preferences show one still model; off-screen and background playback pauses automatically. Desktop and mobile both lead with the model showcase. Built with the Sites Vinext starter, server route handlers, browser-native JavaScript, and a persistent Cloudflare D1 database. No passwords or session tokens are stored in browser localStorage.

## Project structure

- `app/route.ts` serves the landing page; `lib/landing-html.ts` holds the markup and model framing data.
- `public/` contains the current styles, browser scripts, three model sprites, WW logo, and licensed font.
- `lib/auth.ts`, `lib/password.ts`, and `lib/security.ts` implement authentication and security; `db/` and `drizzle/` define the database and migrations.
- `tests/` contains the password and HTTP authentication checks.
- `worker/`, `scripts/`, and `.openai/hosting.json` retain the Sites runtime, preview, and publishing configuration.
- `app/layout.tsx`, `app/globals.css`, and `vendor/` support framework fallback pages. The landing page uses its own static stylesheet.

Local database state in `.wrangler/state` must be preserved. Build output and publication archives are generated and ignored by Git.

## Repository privacy

This repository contains source code and placeholder configuration only. Live hosting identifiers, environment files, credentials, database contents, generated builds, and local tool state are excluded. Set secrets through your deployment platform or an ignored local environment file; never add credentials to source files or the tracked `.npmrc`. Git ignore rules do not remove secrets already committed.

The `.openai/hosting.json` file contains storage bindings only. Configure your own Sites project ID before publishing; local development does not require that ID.

## Run locally

Node.js 22.19+ is required. Install with `npm ci`. Dependencies and build output are not included in Git.

1. Run `npm run build`.
2. On a fresh local database only, apply `drizzle/0000_sour_callisto.sql`:

   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sour_callisto.sql`

3. Run `npm start -- --port 8787 --var APP_ORIGIN:http://127.0.0.1:8787`.
4. Open http://127.0.0.1:8787.

Use `npm run dev` for source hot reload; set APP_ORIGIN to the printed local origin. Local preview data is stored in ignored `.wrangler/state`. Production D1 is a separate database; deployment applies the checked-in migrations. Never replay an applied migration.

## Authentication

- Create an account using an email and a 15–128-character password; then sign in or out. Email is trimmed and lowercased; passwords are never trimmed or silently truncated.
- Passwords use scrypt with a fresh 16-byte random salt: N=16384, r=8, p=5, 32-byte derived key. This is an OWASP-listed profile suitable for the Worker memory budget. Comparisons use constant-time equality. Unknown accounts and Google-only accounts also perform a password derivation.
- SQL uses bound parameters. Unique constraints and atomic database operations prevent duplicate users and races in rate limiting.
- HttpOnly, SameSite=Lax cookies hold random 256-bit session tokens. Production HTTPS uses `__Host-WardrobeWish` with Secure; local HTTP uses `WardrobeWish_local`. Only token hashes are stored in D1. Session IDs rotate at authentication; logout deletes the active server session. Default sessions last 12 hours; “Keep me signed in” lasts 30 days; anonymous sessions last one hour. Renaming the session cookie requires existing users to sign in again; their accounts and passwords remain valid.
- All writes require the configured Origin and a session-bound CSRF token. OAuth additionally uses state, PKCE S256, a nonce, a ten-minute one-use flow record, and verified Google ID tokens (signature, issuer, audience, expiry, subject, verified email, and nonce).
- Google accounts are keyed by Google's stable subject. Existing email/password accounts are never silently linked by email. An email already used by a password account must continue using that account; explicit account linking is outside this phase.
- Dynamic data is rendered via textContent. CSP allows same-origin external scripts/styles only, with no inline/eval, objects, or framing. Additional headers include no-sniff, no-referrer, no-store, and HTTPS HSTS.
- Account guesses are limited to 10 per 15 minutes; writes to 45 per IP per 15 minutes; account creation to 5 per IP per hour; Google initiation to 10 per IP per 15 minutes. Limits persist in D1 and return HTTP 429 with Retry-After. Failed requests never log passwords, raw tokens, or OAuth authorization codes.
- Production assumes deployment behind Cloudflare's trusted edge, which supplies CF-Connecting-IP. Do not expose this Worker through a proxy that lets clients spoof that header. Keep APP_ORIGIN set to the actual trusted HTTPS origin; changing domains requires updating both APP_ORIGIN and the Google redirect URI.

## Connect Google

Google credentials were not supplied, so the Google button currently explains that email sign-in is available. No simulated Google account is created.

1. Create a Web application OAuth client in your Google Cloud project and configure its consent screen. If the app is in Testing, add the intended Google test users.
2. Register the production redirect URI using the actual deployed Site origin configured in `APP_ORIGIN`:
   `<APP_ORIGIN>/api/auth/google/callback`
   Replace `<APP_ORIGIN>` with that HTTPS origin, without a trailing slash; do not register the placeholder literally.
3. Configure Sites runtime environment variables: `GOOGLE_CLIENT_ID` and secret `GOOGLE_CLIENT_SECRET`. Set APP_ORIGIN to your deployment origin. Never paste secrets into source or commit them. For local development, use an ignored `.dev.vars` file beside the Wrangler configuration with the local redirect URI registered in Google.
4. Redeploy the saved version to apply the environment change, then complete a real Google sign-in to validate consent and the callback.

The private Sites access gate remains intact and is separate from the application's email/Google account. Only the Site owner can open this published preview until its audience is explicitly changed.

## Verification

`npm run typecheck`

`npm test`

With a fresh local preview running: `npm run test:integration`. Integration fixtures use example.test addresses and remain local. Repeated runs within 15 minutes can intentionally exhaust the shared local IP rate limit. The suite checks signup/login/logout, session rotation and revocation, persistence, SQL/XSS input handling, CSRF/origin defenses, password bounds, payload limits, security headers, missing Google configuration, forged callbacks, and concurrent rate limiting. A real Google end-to-end login still requires credentials.

Account recovery, email verification, MFA, account linking, and the wardrobe catalog are not part of this first login-page phase. This implementation has targeted automated checks; it has not had an independent security audit.

## References

- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Cloudflare node:crypto support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)

## Image asset

The showcase uses six individual cutouts from `public/model-pair-01.webp`, `public/model-pair-02.webp`, and `public/model-pair-03.webp`. See [MODEL-ASSETS.md](MODEL-ASSETS.md) for image-generation prompts and provenance. The unused source photographs have been removed from the checkout; the generation prompt is retained below, and earlier assets remain recoverable from the original Site repository history.

The earlier `public/campaign.png` was generated with the built-in image generation tool and copied into the project. The supplied screenshot was used as visual direction, not as instructions.

Final prompt: “Use case: photorealistic-natural. Asset type: editorial fashion photograph for the left half of a minimal fashion account sign-in website. Create a premium studio fashion campaign, full length image of two stylish adult models with generous negative space above and below. One Black male model on the left wears an oversized charcoal blazer over a dusty muted purple sweater with a white shirt collar showing, extremely wide dark charcoal trousers and black loafers, slim black glasses. One East Asian female model on the right wears a long sand-colored trench coat over a vivid chartreuse green hooded sweatshirt, tailored black cropped trousers, white socks and black loafers. Their poses relaxed and subtly asymmetrical, looking in different directions, both standing apart. Pale cool gray-green seamless studio background and floor (#e3e6e0), soft light and subtle ground shadows. Front view, camera at waist height, restrained high-end independent fashion magazine art direction, realistic cloth texture. Portrait 4:5 composition, show entire bodies and shoes, subjects fill central 75 percent of height. No text, no lettering, no logos, no borders or website UI.”

Verified on 23 November 2026: production build, TypeScript, four password/token tests, thirteen HTTP authentication/security cases, and browser signup/sign-in/sign-out. Full npm audit: zero reported vulnerabilities. Desktop and mobile layouts were checked. Live Google consent remains unverified pending OAuth credentials.

## Wordmark typeface

The WardrobeWish wordmark uses Questrial Regular at weight 400, with tight spacing, as a close visual match to the user's thin geometric lettering reference. The logo remains live text beside the WW monogram. The Latin WOFF2 font is self-hosted at `public/fonts/questrial-latin-400.woff2` and preloaded; the SIL Open Font License is included at `public/fonts/OFL-Questrial.txt`. Only the wordmark uses this font.

Source: [Google Fonts Questrial](https://github.com/google/fonts/tree/main/ofl/questrial), served from the official Google Fonts stylesheet. The exact typeface in the reference was not identified.

## Brand icon

`public/ww-monogram.svg` is the current header icon and favicon: two clean W outlines centered inside a square border, all in light brown (`#b38c6d`) on a transparent background. The vector asset stays crisp at every size and sits to the left of the centered WardrobeWish title.

The previous `public/wardrobe-icon.png` (160 × 160) and `public/favicon.png` (64 × 64) were removed as unused historical assets; they remain recoverable from the original Site repository history. They were generated from the user's supplied T-shirt/clothes-rail icon with the built-in image generation tool, then resized and compressed with Sharp.

Final prompt: “Use case: logo-brand, precise-object-edit. Asset type: compact website brand icon and favicon for WardrobeWish. Edit the attached reference icon, which has black strokes on a transparent background: a front-facing T-shirt suspended under a horizontal clothes rail with staggered hangers behind it. Preserve that instantly recognizable T-shirt plus wardrobe rail concept. Make a modest original variation: use a clean, consistent, medium-bold charcoal (#252b24) outline, a slightly wider shirt with balanced short sleeves and a simple curved crew neckline; keep two neat staggered hanger outlines behind the shirt, reduce clutter where the hooks meet the rail, and use gently rounded stroke ends with precise restrained corners. The rail should be the same stroke thickness as the shirt outline rather than the very thick rail of the reference. Flat monochrome vector-like line art, crisp and optically balanced, legible at 36px. Center one single icon tightly in a square canvas with approximately 7 percent padding. Truly transparent background, including all interior negative spaces. No container, badge, gradient, glow, shadows, texture, words, letters, logo text, or multiple options. This is just the icon, not a wordmark or website mockup.”
