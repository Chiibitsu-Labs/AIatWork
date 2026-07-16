import { hasCookieSecret, isValidAccessKey, issueSession, validAccessKeys } from "../lib/cookie.js";

export const config = { runtime: "edge" };

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h — client re-enters key next visit

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  }

  if (!hasCookieSecret() || validAccessKeys().length === 0) {
    return json({ error: "not_configured" }, 503);
  }

  let key = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    key = String((await request.json())?.key ?? "");
  } else {
    key = String(new URLSearchParams(await request.text()).get("key") ?? "");
  }

  if (!isValidAccessKey(key)) {
    return json({ error: "invalid_key" }, 401);
  }

  const token = await issueSession(SESSION_TTL_SECONDS);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": `cl_setup=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
    },
  });
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}
