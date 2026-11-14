# TrackMe

Daily work log for the team. Sign in with Google, write what you got done, done.

## Run

```sh
cp .env.example .env      # then edit: timezone, working days, email
docker compose up -d      # Postgres on :5433
npm install
npm run migrate           # creates/updates the tables
npm run dev               # or: npm run build && npm start
```

The database is defined in `prisma/schema.prisma`. After changing it, run
`npx prisma migrate dev --name what_changed`.

## Google sign-in

1. Go to https://console.cloud.google.com, create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose *Internal* (Workspace, only your
   company) or *External*, fill in the app name and your email, save.
   External apps in *Testing* mode only let in the test users you add there.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   type *Web application*. Add an authorized redirect URI:
   `http://localhost:3000/auth/callback` (and `https://your-domain/auth/callback` for production).
   It must be `APP_URL` + `/auth/callback`, exactly.
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and set
   `AUTH_SECRET` (`openssl rand -base64 32`). Optionally set `GOOGLE_ALLOWED_DOMAIN`.

Signing in matches the Google email to a person on the People screen. If nobody has
that email, a new person is added (role Dev, edit it on People).

## Emails

On working days, people with no entry get a reminder at `REMIND_AT`, and admins get
the who-wrote list at `SUMMARY_AT`. Set emails and admins on the People screen.
Emails go through Resend: put your API key in `RESEND_API_KEY` and a sender on your
verified domain in `MAIL_FROM`. With no key, emails are off.
The app must run as one always-on server for the schedule to fire.

## Test

```sh
npm test
```
