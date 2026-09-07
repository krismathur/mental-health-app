# Deploying MindZone

Written for Hostinger, but the requirements are the same anywhere.

## What the host must provide

1. **Node.js 20+** with a long-running process. On Hostinger that means a
   **Business** or **Cloud** plan (Node apps are supported there and can deploy
   straight from GitHub) or a **VPS**. The cheapest shared/PHP tiers cannot run
   this app at all.
2. **A writable directory that survives redeploys.** SQLite is a file, not a
   service, so "no databases" is not a blocker — but if the disk is wiped on
   each deploy, every account goes with it. Point `DATA_DIR` at the persistent
   path (see below).
3. **HTTPS.** The app forces it in production and sets HSTS.

## Environment

Copy `.env.example` to `.env` and fill it in. In production the app **refuses to
start** if anything required is missing, rather than failing later in front of a
user.

```bash
# generate the session secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Variable | Required | Notes |
|---|---|---|
| `SESSION_SECRET` | yes (production) | Long random string. Changing it logs everyone out. |
| `GEMINI_API_KEY` | yes | Coach, plans, and meditation audio all need it. |
| `GEMINI_MODEL` | yes | e.g. `gemini-2.5-flash` |
| `NODE_ENV` | yes | Set to `production`. Turns on HTTPS redirect, secure cookies, HSTS, real cache headers. |
| `PORT` | no | Defaults to 3000; most hosts inject their own. |
| `DATA_DIR` | **strongly recommended** | Absolute path to the persistent disk. Defaults to `./data`, which many hosts wipe on redeploy. |
| `TRUST_PROXY` | no | Leave unset. Only set to `false` if nothing proxies the app. |

## Deploy steps

```bash
npm ci --omit=dev     # install
npm test              # 21 tests, no API key or network needed
NODE_ENV=production npm start
```

Point the host's start command at `npm start`.

## After the first deploy, check

- `GET /health` returns `{"status":"ok","env":"production"}`
- `https://` works and `http://` redirects to it
- The login cookie shows `Secure`, `HttpOnly`, `SameSite=Lax` in devtools
- Signing up, onboarding (including the parental consent box), and one coach
  message all work
- **Type a crisis phrase into the coach and confirm the help card appears.**
  This is the one behaviour worth verifying by hand on every deploy.
- Browser console is clean — a Content-Security-Policy error means an asset is
  loading from an origin the policy doesn't allow

## Backups

The whole database is `DATA_DIR/database.db`. Back it up on a schedule:

```bash
sqlite3 "$DATA_DIR/database.db" ".backup '/backups/mindzone-$(date +%F).db'"
```

It contains children's names, ages, and their chats with the coach. Store
backups somewhere private and encrypted, and delete old ones on a schedule.

`DATA_DIR/sessions.db` is just login sessions and does not need backing up.

## Known issues to watch

- **`sqlite3` pulls a vulnerable `node-gyp`/`tar` chain.** These are build-time
  only and not loaded at runtime, and `sqlite3@6.0.1` is already the latest
  release, so there is no upgrade that clears it today. The real fix is
  migrating to `better-sqlite3`, which ships prebuilt binaries — a contained
  change, but it touches every database call, so it should be done deliberately
  with the tests green rather than as part of a deploy.
- **Images are ~72 MB**, down from 134 MB (oversized gear thumbnails were
  rebuilt at 240x240 and dead files removed). Most of what remains is the
  `public/images/studio/gear/` layer art, which the wardrobe compositor reads
  pixel by pixel and so has to stay full resolution.

## Password reset

Password reset needs outbound email. Without SMTP settings the flow turns
itself off: `/api/forgot-password` returns 503 and the "Forgot password?"
link never renders, so nobody is sent down a path that cannot finish. The app
prints a warning at boot when this is the case.

Hostinger includes email hosting, so the settings come from the same account:

    SMTP_HOST=smtp.hostinger.com
    SMTP_PORT=465
    SMTP_USER=no-reply@yourdomain.com
    SMTP_PASS=<the mailbox password>
    MAIL_FROM=MindZone <no-reply@yourdomain.com>

`APP_URL` must also be set to the real public origin. Reset links are built
from it and never from the request's Host header, which the caller controls —
trusting that header would let an attacker have a real token mailed out
pointing at their own site.

Tokens are 32 random bytes, stored only as a SHA-256 hash, valid for one hour,
and single use. Completing a reset also deletes every open session for that
account, so a reset actually evicts an intruder instead of leaving their
session alive.

