// Signed session cookie helpers using Web Crypto (runs on Vercel's Edge
// runtime, so no node:crypto). The cookie only asserts "this browser
// presented a valid access key before <exp>" — it carries no secret and
// no client data.

const enc = new TextEncoder();

function b64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return b64url(sig);
}

export function cookieSecret() {
  return process.env.SETUP_COOKIE_SECRET || "";
}

export function hasCookieSecret() {
  return cookieSecret().length >= 32;
}

export async function issueSession(ttlSeconds) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + ttlSeconds * 1000 })));
  const sig = await hmac(cookieSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verifySession(token) {
  if (!token || !hasCookieSecret()) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = await hmac(cookieSecret(), payload);
  // Length-safe compare (both are fixed-length base64url HMACs).
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const data = JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

// Valid access keys, comma-separated in SETUP_ACCESS_KEYS. Rotating =
// edit this list. Issue one per client, revoke by removing it.
export function validAccessKeys() {
  return (process.env.SETUP_ACCESS_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function isValidAccessKey(candidate) {
  const keys = validAccessKeys();
  let ok = false;
  // Compare against all keys (no early return) so timing doesn't reveal
  // which/how-many keys exist.
  for (const k of keys) {
    if (k.length === candidate.length) {
      let diff = 0;
      for (let i = 0; i < k.length; i++) diff |= k.charCodeAt(i) ^ candidate.charCodeAt(i);
      if (diff === 0) ok = true;
    }
  }
  return ok;
}
