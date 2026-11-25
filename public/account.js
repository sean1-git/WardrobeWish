"use strict";
const $ = (id) => document.getElementById(id);
let csrf = "", mode = "login", busy = false;
const overlayChanged = () => document.dispatchEvent(new Event("wardrobewish:overlay-change"));
function openAccount() {
  if (!$("account").open) $("account").showModal();
  $("open-account").setAttribute("aria-expanded", "true");
  overlayChanged();
  if (!$("member-view").hidden) $("member-title").focus();
  else $("email").focus();
}
$("open-account").addEventListener("click", openAccount);
$("account-close").addEventListener("click", () => $("account").close());
$("account").addEventListener("close", () => {
  $("open-account").setAttribute("aria-expanded", "false");
  overlayChanged();
});
$("account").addEventListener("click", (event) => {
  if (event.target !== $("account")) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
const message = (text, member = false) => {
  const box = $(member ? "member-message" : "message");
  box.textContent = text;
  box.hidden = !text;
};
function setBusy(value) {
  busy = value;
  $("submit-button").disabled = value || !csrf;
  $("google-button").disabled = value;
  $("switch-mode").disabled = value;
  $("logout-button").disabled = value;
  $("submit-button").textContent = value ? "One moment…" : mode === "login" ? "Sign in" : "Create account";
}
function showUser(user, focus = false) {
  $("open-account").textContent = user ? "Account" : "Sign in";
  $("auth-view").hidden = !!user;
  $("member-view").hidden = !user;
  $("account").setAttribute("aria-labelledby", user ? "member-title" : "form-title");
  if (user) {
    $("member-email").textContent = user.email;
    $("member-provider").textContent = user.provider === "google" ? "Connected with Google" : "Email account";
    $("password").value = "";
    if (focus) $("member-title").focus();
  }
}
async function bootstrap() {
  try {
    const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "We couldn't connect. Refresh the page to try again.");
    csrf = data.csrf;
    showUser(data.user);
    setBusy(false);
  } catch (error) { message(error.message || "We couldn't connect. Refresh the page to try again."); }
}
async function post(path, data) {
  const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 403) await bootstrap();
    throw new Error(result.error || "Something went wrong. Please try again.");
  }
  return result;
}
$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !csrf) return;
  message(""); setBusy(true);
  try {
    const data = await post("/api/auth/" + mode, { email: $("email").value, password: $("password").value, remember: $("remember").checked });
    csrf = data.csrf;
    showUser(data.user, true);
  } catch (error) { message(error.message || "Please check your connection and try again."); }
  finally { setBusy(false); }
});
$("switch-mode").addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  const signup = mode === "signup";
  $("form-title").textContent = signup ? "Create an account" : "Sign in";
  $("form-intro").textContent = signup ? "Start with your email and a password." : "Welcome back to WardrobeWish.";
  $("switch-copy").textContent = signup ? "Already have an account?" : "New to WardrobeWish?";
  $("switch-mode").textContent = signup ? "Sign in" : "Create an account";
  $("password").autocomplete = signup ? "new-password" : "current-password";
  $("password").minLength = signup ? 15 : 1;
  $("password").placeholder = signup ? "Create a password" : "Enter your password";
  $("password").value = "";
  $("password").type = "password";
  $("password-toggle").setAttribute("aria-pressed", "false");
  $("password-toggle").setAttribute("aria-label", "Show password");
  $("password-hint").hidden = !signup;
  message(""); setBusy(false); $("email").focus();
});
$("password-toggle").addEventListener("click", () => {
  const visible = $("password").type === "password";
  $("password").type = visible ? "text" : "password";
  $("password-toggle").setAttribute("aria-pressed", String(visible));
  $("password-toggle").setAttribute("aria-label", visible ? "Hide password" : "Show password");
});
$("google-button").addEventListener("click", async () => {
  if (busy) return;
  setBusy(true); message("");
  try {
    if (!csrf) await bootstrap();
    if (!csrf) throw new Error("Refresh the page to reconnect, then try again.");
    const result = await post("/api/auth/google", {});
    const url = new URL(result.url);
    if (url.origin !== "https://accounts.google.com") throw new Error("We couldn't connect to Google. Please try again.");
    window.location.assign(url.href);
  } catch (error) { message(error.message || "We couldn't connect to Google. Please try again."); setBusy(false); }
});
$("logout-button").addEventListener("click", async () => {
  setBusy(true); message("", true);
  try { await post("/api/auth/logout", {}); csrf = ""; showUser(null); await bootstrap(); $("email").focus(); }
  catch (error) { message(error.message || "We couldn't sign you out. Please try again.", true); }
  finally { setBusy(false); }
});
function openDialog(title, paragraphs) {
  $("dialog-title").textContent = title;
  $("dialog-content").replaceChildren(...paragraphs.map(text => { const p = document.createElement("p"); p.textContent = text; return p; }));
  $("info-dialog").showModal();
  overlayChanged();
}
$("privacy-button").addEventListener("click", () => openDialog("Your space. Your details.", ["WardrobeWish stores your email address and a salted, one-way password hash to keep your account working. If you choose Google, we receive your verified email and Google account identifier; we never receive your Google password.", "Essential cookies keep you signed in and protect your account. We do not use advertising trackers on this page. Signing out removes this browser’s active session."]));
$("dialog-close").addEventListener("click", () => $("info-dialog").close());
$("dialog-done").addEventListener("click", () => $("info-dialog").close());
$("info-dialog").addEventListener("close", overlayChanged);
$("info-dialog").addEventListener("click", (event) => { if (event.target === $("info-dialog")) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
if (new URLSearchParams(location.search).get("auth") === "google_failed") {
  openAccount();
  message("Google sign-in couldn't be completed. Try again, or use your email and password if you already have an account.");
  history.replaceState(null, "", "/");
}
bootstrap();
