# Harborstone Mobile

Harborstone Mobile is an interactive financial-safety training experience. Account figures and historical transaction examples are illustrative and stored in the browser; no real bank, card network, ACH, wire, or deposit-processing rails are connected. Do not enter real banking credentials, card details, PINs, or identity documents.

## Restricted-account behavior

All outgoing payment rails are rejected before funds or settlement logic can run. Check deposits are rejected without credit. Existing pending items from older browser storage are normalized to blocked records at startup, available balances are restored to current balances, and scheduled instructions are paused.

# Harborstone Mobile — *Your finances. Your direction.*

A fictional, educational mobile-banking web app (school project). **All balances, payments, deposits, cards, receipts and statements are simulated.** Harborstone Bank is not a real bank. Nothing moves real money and no real card/bank credentials are collected.

Built as a **separate project** from Prosperity Mobile (your original ZIP was never modified).

## What was reused from Prosperity Mobile — and what changed
| Reused | Changed / why |
|---|---|
| Vercel layout: static `public/` + `api/` serverless functions, no build step | The Prosperity front end is one 780 KB `index.html` with ~10 stacked style patches and a different 5-tab set (Account, Deposit, Pay, AI, More). Restyling it into Home/Accounts/Payments/Cards/More would have meant fighting every patch, so Harborstone's front end is **modular** (`public/js/*.js`, `public/css/*.css`). |
| Email-OTP design (stateless sealed token, 6 digits, 5-min expiry, AES-256-GCM) | Re-written as `api/auth/*.js`: **separate `HM_*` env vars**, email+password login, HMAC'd code hash, Resend **or** SMTP, a dev-only mode that is hard-blocked on Vercel Production. Old `PPB_*`, Gmail secrets and the `OTP_TOKEN_SECRET` fallback chain are gone. |
| PWA approach (manifest, standalone, safe-area insets) | Added a service worker, maskable icon, `100dvh` layout, keyboard-aware nav. |
| "Frozen/restricted account blocks outgoing money, balance never drops, failed attempt is recorded" and "outcomes follow rules, no manual Success/Pending/Failed selector" | Generalised into one rules engine (`HM.execute` in `core.js`) used by every rail, **per account**, with real Freeze/Unfreeze. |
| Separate polished receipt per rail | 7 distinct layouts (Instant ACH, Standard ACH, wire advice, check, transfer, bill, deposit) with a small fictional-bank line at the foot. |

## Folder structure
```
harborstone-mobile/
├─ public/                  ← served as the site root
│  ├─ index.html            app shell (nav, toast, sheet)
│  ├─ manifest.webmanifest, sw.js, icons/
│  ├─ css/app.css           design system, components   css/views.css  screens, receipts, card, camera
│  └─ js/
│     core.js      utils, icons, state store (localStorage), seeded sample data, transaction rules engine
│     ui.js        router + back stack, forms/validation, sheets, charts, filters
│     auth.js      login, email OTP, resend cooldown, register/forgot demos, sign-out, idle timeout
│     home.js  accounts.js  payments.js  receipts.js  cards.js  more.js   one file per tab
│     main.js      bootstrap
├─ api/auth/request-otp.js, verify-otp.js, _lib.js
├─ tests/  run-all.mjs, run.cjs, routes.cjs, auth-api.cjs, api-server.mjs, helpers.cjs   Playwright tests
├─ dev-server.mjs, package.json, vercel.json, .env.example, .gitignore
```

## Run locally
Sign-in is always checked by the server (email + password, then an emailed 6-digit code); there is no local shortcut. To run the real API locally:
```bash
npm install
cp .env.example .env.local     # fill in YOUR private values (never commit this file)
npx vercel dev                 # http://localhost:3000
```
`npm start` only serves the static interface (login will report that the secure sign-in service is not running).

## Tests
```bash
npm i -D playwright && npx playwright install chromium
npm test        # starts tests/api-server.mjs (real api/auth handlers, Resend call stubbed, test-only credentials) and runs
                # run.cjs (UI/payments/frozen rules), routes.cjs (route crawler), auth-api.cjs (login + OTP)
```
The harness proves the server logic and the request that would be sent to Resend. It does **not** prove delivery by a real email provider.

## Layout notes (mobile shell)
- `public/css/layout.css` is the single authoritative layout layer (loaded after `app.css`): app shell, safe areas, login/OTP, bottom navigation, support button, Home.
- `#app` is `position:fixed; inset:0` and a flex column: `#view` scrolls, `#nav` is a normal row at the bottom (not an overlay), so it can never cover content and always spans the safe area. Five equal tabs on one baseline.
- Login/OTP/forgot hide the nav and the support button (`body.auth`); the keyboard hides them via the visual-viewport check (`body.kbd-open`).
- The support button is a sibling of the nav and is hidden on pages that contain entry fields.

## GitHub (new, separate repository)
```bash
cd harborstone-mobile
git init && git add . && git commit -m "Harborstone Mobile"
git branch -M main
git remote add origin https://github.com/<you>/harborstone-mobile.git   # create this EMPTY repo first on github.com
git push -u origin main
```
`.env` files are git-ignored; never commit secrets.

## Vercel (separate project)
1. vercel.com → **Add New → Project** → import the **harborstone-mobile** repo (not the Prosperity one).
2. Framework preset **Other**; leave build/output settings empty.
3. Add the environment variables below (Settings → Environment Variables), then **Deploy**.

## Environment variables
| Variable | Required | Purpose |
|---|---|---|
| `HM_LOGIN_EMAIL` | yes | email used to sign in |
| `HM_LOGIN_PASSWORD` | yes | password used to sign in |
| `HM_OTP_SECRET` | yes | random 24+ chars; `openssl rand -base64 32` |
| `HM_OTP_TO` | no | where the code is emailed (defaults to `HM_LOGIN_EMAIL`) |
| `RESEND_API_KEY` + `HM_FROM_EMAIL` | option A | Resend delivery |
| `SMTP_USER`, `SMTP_PASSWORD` (+ `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `HM_FROM_NAME`) | option B | SMTP delivery (e.g. Gmail app password); used only if `RESEND_API_KEY` is unset |
| `HM_DEV_OTP=true` | no | dev-only mode (below) |

## Private login credentials (never put these in GitHub or the ZIP)
Sign-in is checked **on the server**. The email, password and signing secret exist only as environment variables:

| Variable | Value |
|---|---|
| `HM_LOGIN_EMAIL` | jessicabrownn088@gmail.com |
| `HM_LOGIN_PASSWORD` | your demo password, typed by you into Vercel |
| `HM_OTP_TO` | jessicabrownn088@gmail.com |
| `HM_OTP_SECRET` | a separate random secret, 24+ chars. Generate: `openssl rand -base64 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |

**Vercel:** Project → Settings → Environment Variables → add each name/value for Production (and Preview) → Redeploy. Values are never in `public/`, never in the HTML/JS, and `.env*` files are git-ignored.
**Local with the real API:** copy `.env.example` to `.env.local`, fill it in, run `npx vercel dev`.

## Connect email delivery (required before real codes arrive)
Nothing is emailed until a provider is configured. Choose one:
- **Resend (recommended):** create a Resend account → API Keys → create key → set `RESEND_API_KEY`. Set `HM_FROM_EMAIL` to a sender on a **domain you verified** in Resend (Domains → add DNS records). Without a verified domain Resend only lets its test sender (`onboarding@resend.dev`) deliver to the email address of your own Resend account.
- **SMTP:** set `SMTP_USER`, `SMTP_PASSWORD` (for Gmail this is an *App Password*, which needs 2-Step Verification on that Google account), optionally `SMTP_HOST`/`SMTP_PORT`.
Then redeploy and run the real test below.

## Email OTP: provider details and test
Prosperity used Gmail SMTP with `PPB_*` variables. Harborstone is independent: **do not reuse** those values.

**Resend setup**
1. Create a *new* Resend API key named "Harborstone" (resend.com → API Keys). Put it in `RESEND_API_KEY` in Vercel only.
2. Sender: add and verify a domain you own (Resend → Domains → DNS records), then set `HM_FROM_EMAIL="Harborstone Bank <no-reply@yourdomain.com>"`. Without a verified domain Resend only allows its test sender `onboarding@resend.dev`, and only to your own Resend account email.
3. Redeploy (env changes apply to new deployments).

**Test:** open the site → sign in with `HM_LOGIN_EMAIL`/`HM_LOGIN_PASSWORD` → check the inbox (and spam) for "Your Harborstone Bank verification code" → enter it. Also try a wrong code, an expired code (wait 5 min) and Resend (30 s cooldown).

**Development-only mode:** optional `HM_DEV_OTP=true` is supported only outside production for isolated testing. Do not use it for real inbox delivery; configure Resend or SMTP to send codes to the configured address.

**Known limits (stateless demo):** the server cannot count attempts or enforce a resend cooldown (the app does, in the browser), and a code can be reused within its 5 minutes. The session itself is client-side; fine for a demo with sample data, but not production banking security.

## Add to iPhone Home Screen
Open the deployed URL in **Safari** → Share → **Add to Home Screen** → Add. After a visual update, delete the old icon and add it again (iOS caches web-app settings).

## Behaviour rules (all automatic — there is no Success/Failed selector)
- **Frozen account** (Accounts → account → Account controls): blocks ACH, wire, check, bill, scheduled payments, transfers out, ATM withdrawals and card purchases; balance never drops; the attempt is saved as a *blocked demo attempt* with a receipt. Deposits/credits still work.
- **Funds & limits** are validated before anything is sent; failures never deduct money. Limits per rail + combined are editable in Payments → Daily limits (defaults: Instant ACH 5,000 · Standard ACH 10,000 · wire 25,000 · check 5,000 · withdrawal 1,000 · deposit 5,000 · all payments 30,000).
- **Processing rule:** Instant ACH, wire, transfers, bills and ATM are immediate. Standard ACH, check payments, mobile deposits and card purchases are **pending**; pending debits reduce *available* now and *current* when they post, **~90 seconds** after submission.
- **Duplicates:** each review screen has a one-time idempotency key, the button disables on tap, and the engine rejects a repeated key.
- Wire fee $25. Routing numbers must pass the ABA checksum.

## Honest scope notes
- Sample merchants, beneficiaries, branches/ATMs and balances are **demonstration data**. The customer profile (Jessica Brown Jeffery, preferred name "Beldot") is defined in `HM.defaultProfile()` in `public/js/core.js`; a browser that still holds the untouched old "Samuel" profile is migrated automatically, and a profile you edited is never overwritten.
- The "camera" is a simulated viewfinder: no camera permission is requested and check images are generated from the details you type.
- Face ID is a simulation. Change password validates input but can't change your Vercel password. Change PIN never stores the PIN.
- The app does **not** claim FDIC membership: Harborstone is fictional, and that claim would be false. Receipts and statements carry a single small line saying Harborstone Bank is a fictional bank (school project).


## Current sign-in behaviour
- The sign-in page pre-fills the configured login email, while the password is entered by the account owner.
- The server validates both credentials before generating an OTP.
- OTP is sent to `HM_OTP_TO` (or `HM_LOGIN_EMAIL` when `HM_OTP_TO` is omitted).
- The six-digit code expires after five minutes; incorrect and expired codes are rejected.
- Resend requests a newly generated code and invalidates the earlier request from the UI's perspective.
- The static preview server does not create a fake successful login. Use `npx vercel dev` for local API-backed sign-in.


## Version 8 update

- Bottom navigation now uses five equal, horizontally aligned tabs: Home, Activity, Transfer, Cards, and More.
- Transfer is no longer raised or visually larger than the other tabs.
- Navigation and the support shortcut account for mobile safe-area spacing, including the iPhone home-indicator area.
- Activity now includes all supported ledger entries, search/filter controls, and a spending-analytics view.
- A support shortcut is available above the navigation on signed-in screens.

The app remains a project interface. External banking rails, KYC providers, card processors, investment providers, credit bureaus, and native biometric APIs require separately configured and authorized services; interface actions must not be interpreted as proof that those external operations occurred.
