# AI @ Work — Use Case Lab

A small static site for Chiibitsu Labs' **AI @ Work: Use Case Lab** workshop.
Self-contained HTML, inline CSS, no build step. Deployed on Vercel.

| Route | Page |
|-------|------|
| `/` | Landing |
| `/menu` | Use Case Menu |
| `/merg-updates` | MERG workshop follow-up signup ([clients/merg](clients/merg)) |
| `/2nd-brain-kit` | Second Brain Kit setup guide (password-gated, see below) |
| `/2nd-brain-kit-login` | Access-key entry for the Second Brain Kit guide |

Client-specific pages live under `clients/<client>/`. `POST /api/subscribe` is a Vercel serverless function that adds signups to Resend (contact + segment + confirmation email) — see `.env.example` for required environment variables.

### Second Brain Kit gate

`/2nd-brain-kit` is gated by a real server-side check, not a client-side password: `middleware.js` (Vercel Routing Middleware, runs on every request to that path) verifies a signed session cookie via `lib/cookie.js` before the page is ever served, redirecting to `/2nd-brain-kit-login` otherwise. `POST /api/2nd-brain-kit-unlock` checks the submitted key against `SETUP_ACCESS_KEYS` and, if valid, issues a 12h signed cookie. Requires `SETUP_ACCESS_KEYS` and `SETUP_COOKIE_SECRET` to be set in Vercel — see `.env.example`.

_Chiibitsu Labs — more human, by design · book.chiibitsu.com_
