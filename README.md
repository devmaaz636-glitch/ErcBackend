# ERC Backend

API for the Enfield Royal Clinics app. Right now it handles **password reset**:

1. `POST /api/auth/password-reset/request` `{ email }` → emails a 6-digit code
2. `POST /api/auth/password-reset/verify` `{ email, code }` → returns a one-time `resetToken`
3. `POST /api/auth/password-reset/confirm` `{ resetToken, password }` → sets the new password in Firebase Auth

Redis stores the codes (hashed), cooldowns and rate limits. Firebase Auth stays the user store.

## Rules built in

| Rule | Default |
| --- | --- |
| Code expires after | 10 minutes |
| Resend cooldown | 60 seconds |
| Codes per email per hour | 5 |
| Wrong attempts per code | 5, then the code is deleted |
| Reset token lifetime | 15 minutes, single use |
| Requests per IP per hour | 30 (request), 60 (verify) |
| Password | 8+ characters, at least one letter and one number |

Unknown emails get the same "code sent" response, so nobody can check which emails have accounts.
After a reset, the user is signed out on all devices.

## Setup

```bash
npm install
cp .env.example .env     # then fill it in
```

You need:

- **REDIS_URL**: from Upstash or Redis Cloud (use the `rediss://` URL).
- **OTP_SECRET**: run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- **Firebase service account**: Firebase console → Project settings → Service accounts → Generate new private key. Save it here as `firebase-service-account.json` (git-ignored).
- **SMTP** (optional in development): with `SMTP_HOST` empty, codes are printed in this console instead of emailed.

## Run

```bash
npm run dev     # restarts on file changes
npm start
npm test        # 18 tests, uses an in-memory Redis, no setup needed
```

The app finds the server automatically on port 4000 of the PC running Expo. If the phone can't reach it,
allow Node.js through Windows Firewall, or set `EXPO_PUBLIC_API_URL=http://<pc-ip>:4000` in the app.
