import { verifySession } from "./lib/cookie.js";

// Gate the guide: /2nd-brain-kit is only served with a valid session
// cookie. Everything the client actually reads lives in that one HTML
// file, so an unauthenticated visitor never receives the guide content —
// this is the real, server-side gate (unlike a client-side password on a
// static page).
export const config = {
  matcher: ["/2nd-brain-kit", "/2nd-brain-kit.html", "/2nd-brain-kit/"],
};

export default async function middleware(request) {
  const cookie = readCookie(request, "cl_setup");
  if (await verifySession(cookie)) return;

  const url = new URL("/2nd-brain-kit-login", request.url);
  url.searchParams.set("next", new URL(request.url).pathname);
  url.searchParams.set("locked", "1");
  return Response.redirect(url, 307);
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}
