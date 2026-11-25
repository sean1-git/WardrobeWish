// Authored sprite framing only; never interpolate request data into this markup.
const models = [
  { source: "model-pair-01.webp", cropX: 0, frame: "42 1" },
  { source: "model-pair-01.webp", cropX: -561, frame: "-46.5 -3" },
  { source: "model-pair-02.webp", cropX: 0, frame: "53 2" },
  { source: "model-pair-02.webp", cropX: -561, frame: "-53 -3" },
  { source: "model-pair-03.webp", cropX: 0, frame: "44 40" },
  { source: "model-pair-03.webp", cropX: -561, frame: "-42.5 33" },
];

const modelFigures = models.map(({ source, cropX, frame }) =>
  `<figure class="model-figure" aria-hidden="true"><svg viewBox="${frame} 561 1402" preserveAspectRatio="xMidYMax meet"><svg width="561" height="1402" overflow="hidden"><image href="/${source}" x="${cropX}" width="1122" height="1402" /></svg></svg></figure>`
).join("\n        ");

export const landingHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#dce3d5"><meta name="description" content="Wear it your way. Discover individual looks in the WardrobeWish style showcase."><title>WardrobeWish — Your style, all in one place.</title><link rel="icon" href="/ww-monogram.svg" type="image/svg+xml" sizes="any"><link rel="preload" href="/fonts/questrial-latin-400.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/styles.css"><script src="/photo.js" defer></script><script src="/account.js" defer></script></head>
<body>
<a class="skip-link" href="#showcase">Skip to the showcase</a>
<header class="header"><h1 class="brand-heading"><a class="wordmark" href="/" aria-label="WardrobeWish home"><img class="brand-icon" src="/ww-monogram.svg" width="48" height="48" alt="" aria-hidden="true">WardrobeWish</a></h1><button class="account-link" id="open-account" type="button" aria-haspopup="dialog" aria-controls="account" aria-expanded="false">Sign in</button></header>
<main class="main" id="showcase" tabindex="-1">
  <section class="editorial" aria-label="WardrobeWish style inspiration">
    <div class="photo-frame" id="model-display">
      <div class="model-stage" role="img" aria-label="Six models wearing charcoal tailoring, a sand trench, burgundy knitwear, olive utility wear, indigo denim, and a camel knit polo." aria-live="off">
        ${modelFigures}
      </div>
    </div>
    <div class="editorial-bottom"><h2>Wear it your way.</h2></div>
  </section>
</main>
  <dialog class="account-dialog" id="account" aria-labelledby="form-title">
    <button class="dialog-close" id="account-close" type="button" aria-label="Close account">×</button>
    <div class="account-content" id="auth-view">
      <h2 class="account-title" id="form-title">Sign in</h2>
      <p class="intro" id="form-intro">Welcome back to WardrobeWish.</p>
      <button class="google-button" id="google-button" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.24-2.51c-.9.6-2.05.96-3.37.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.91a6 6 0 0 1 0-3.82v-2.6H3.06a10 10 0 0 0 0 9.02l3.34-2.6Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.6A6 6 0 0 1 12 5.96Z"/></svg><span>Continue with Google</span></button>
      <div class="divider"><span>or</span></div>
      <form id="auth-form">
        <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required maxlength="254" inputmode="email" autocapitalize="none" spellcheck="false"></div>
        <div class="field"><label for="password">Password</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required maxlength="128" aria-describedby="password-hint"><button class="password-toggle" id="password-toggle" type="button" aria-label="Show password" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12Q12 -2 22 12Q12 26 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div><p class="field-hint" id="password-hint" hidden>Use 15–128 characters. A few memorable words work well.</p></div>
        <label class="remember"><input id="remember" type="checkbox" name="remember"><span>Keep me signed in</span></label>
        <div class="message" id="message" role="status" aria-live="polite" hidden></div>
        <button class="submit-button" id="submit-button" type="submit" disabled>Sign in</button>
      </form>
      <p class="switch-copy"><span id="switch-copy">New to WardrobeWish?</span> <button id="switch-mode" type="button">Create an account</button></p>
      <noscript><p class="noscript">Enable JavaScript to sign in securely.</p></noscript>
    </div>
    <div class="account-content signed-in" id="member-view" hidden>
      <h2 class="account-title" tabindex="-1" id="member-title">You're in.</h2><p class="intro">Your style has a home here.</p>
      <div class="member-card"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><div><span class="small-label">SIGNED IN AS</span><p id="member-email"></p><span class="provider" id="member-provider"></span></div></div>
      <p class="member-copy">Welcome to WardrobeWish. Your account is ready.</p><button class="submit-button" id="logout-button" type="button">Sign out</button><p class="message" id="member-message" role="status" hidden></p>
    </div>
  </dialog>
<footer class="footer"><span>© 2026 WardrobeWish</span><button id="privacy-button" type="button">Privacy</button></footer>
<dialog id="info-dialog" aria-labelledby="dialog-title"><button class="dialog-close" id="dialog-close" type="button" aria-label="Close dialog">×</button><h2 id="dialog-title"></h2><div id="dialog-content"></div><button class="submit-button" id="dialog-done" type="button">Got it</button></dialog>
</body></html>`;
