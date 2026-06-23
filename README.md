# AI @ Work — Use Case Lab

A small static site for Chiibitsu Labs' **AI @ Work: Use Case Lab** workshop.
Self-contained HTML, inline CSS, no build step. Deployed on Vercel.

| Route | Page |
|-------|------|
| `/` | Landing |
| `/menu` | Use Case Menu |
| `/merg-updates` | MERG workshop follow-up signup ([clients/merg](clients/merg)) |

Client-specific pages live under `clients/<client>/`. `POST /api/subscribe` is a Vercel serverless function that adds signups to Resend (contact + segment + confirmation email) — see `.env.example` for required environment variables.

_Chiibitsu Labs — more human, by design · book.chiibitsu.com_
