# Harborstone Mobile — Review update

## Changes in this revision
- Hardened all outbound payment rails so they return blocked/declined/rejected/cancelled outcomes without changing account balances.
- Hardened card and ATM activity so every attempted purchase or withdrawal is blocked without a hold or debit.
- Hardened check deposits so they are rejected without crediting funds.
- Normalized legacy browser-stored pending transactions to blocked records on startup and restored available balances to current balances.
- Paused scheduled payment instructions while the account restriction is active.
- Updated payment help and result wording to remove automatic-pending-settlement claims.
- Improved app shell and login viewport/safe-area behavior for standalone mobile display.
- Updated the PWA description and project documentation to accurately identify the app as a financial-safety training experience.

## Verification
- `node --check public/js/app.js`: passed.
- `node --check api/auth/_lib.js`: passed.
- `node --check api/auth/request-otp.js`: passed.
- `node --check api/auth/verify-otp.js`: passed.
- ZIP archive integrity: verified after packaging.
- Full Playwright suite: not run; Playwright is not installed in the supplied project environment.

## Limitations
- Native Face ID / Android biometric APIs are not implemented by this web-only project; the UI directs users to email verification.
- No real bank, ACH, wire, card network, ATM, or check-clearing integration is connected.
- Seeded ledger records and account figures are illustrative training data. The app must not be used as proof of real funds or payment processing.
