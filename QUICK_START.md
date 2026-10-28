# Her_Shield development quick start

## Active applications

- The project root (`src/`, root `package.json`, and root `vite.config.ts`) is the feature-rich TanStack React app.
- `backend/` is the Express + Mongoose API used by that app.
- `frontend/` forwards its default `dev`, `build`, and `preview` scripts to the primary app. The smaller legacy React Router client is available with `dev:legacy`, `build:legacy`, and `preview:legacy` (port `4173`).
- `server/` is an older TypeScript backend duplicate and is not used by the npm scripts.

The API intentionally does not start unless it connects to MongoDB Atlas. It never falls back to in-memory or mock persistence.

## Configure local environment

Copy `backend/.env.example` to `backend/.env` and set:

- `MONGODB_URI`: your existing Atlas connection URI. Do not paste it into source files, logs, tickets, or documentation.
- `JWT_SECRET`: a random secret of at least 32 characters.
- `PORT`: normally `5000`.
- `CLIENT_URL`: comma-separated allowed frontend origins, normally `http://localhost:5173,http://localhost:4173`.

The root app defaults to `http://localhost:5000/api`. To override it, create a root `.env` with `VITE_API_URL=http://localhost:5000/api`. Add `VITE_GOOGLE_MAPS_API_KEY` to the root `.env` for the map module. This is a browser key and is visible to site visitors: restrict it by website referrer and enable only the APIs it needs. Enable Maps JavaScript API, Places API (New), and Geocoding API in a billing-enabled Google Cloud project. Do not place backend credentials in a `VITE_*` variable. A missing or invalid Maps key leaves the map unavailable and shows a setup error rather than sample results.

Password reset and push alerts are not configured. Confirmed SOS and selected Safe Journey events can request Twilio SMS for individually opted-in contacts. A contact must have both SMS consent and journey-sharing consent before selection for journey messages. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM` in `backend/.env`; never put provider credentials in `VITE_*` variables or frontend code. Delivery status callbacks require a publicly reachable HTTPS endpoint configured as `TWILIO_STATUS_CALLBACK_URL`.

Twilio's [India SMS guidelines](https://www.twilio.com/en-us/guidelines/in/sms) describe international delivery through random operator-approved short codes without DLT registration, and domestic delivery using DLT-registered alphanumeric Sender IDs after company and Sender ID registration. The actual route, sender eligibility, delivery, and pricing depend on the Twilio account and recipient network. Review the [current India pricing page](https://www.twilio.com/en-us/sms/pricing/in) and verify the chosen sender/gateway with Twilio before enabling live notifications. Pricing is usage-based and can vary by route and message segments; this project has not verified your account-specific price or sender registration.

## Install and start (PowerShell)

From `C:\Users\<you>\Desktop\Her_Shield\her-shield-main`:

```powershell
npm ci
npm ci --prefix backend
```

Start these in separate terminals:

```powershell
npm run dev:backend
```

```powershell
npm run dev
```

The primary app is `http://localhost:5173`. The API is `http://localhost:5000`, with a readiness check at `http://localhost:5000/api/health`. The health check returns success only after Atlas is connected.

To run the smaller older UI instead, use `npm run dev:legacy` from `frontend/`; its Vite proxy forwards `/api` to port `5000`. This legacy client does not include the full safety-module catalog.

## Current API-backed flows

- Signup and login use MongoDB-backed users, bcrypt password hashes, and JWT authentication.
- Profile reads and updates, trusted contacts, explicit location saves, SOS records, and dashboard summaries require a valid bearer token and are stored in MongoDB. Trusted contact phone numbers must include `+` and the country code in E.164 format.
- An SOS entry is saved to the account first. Twilio SMS is attempted only after explicit SOS confirmation and only to selected contacts whose SMS consent is recorded. Provider acceptance is not proof of delivery; this app does not contact emergency services.
- Safe Journey supports per-journey selection of contacts who have consented to both SMS and journey sharing. Start, check-in, complete, cancel, and one overdue reminder can generate SMS attempts. The backend checks overdue journeys once per minute and records a durable claim; server downtime can delay notices. Location is not tracked, and no message reports that a journey is verified safe.
- Nearby hospital and police listings use Google Maps Places nearby search (5 km radius); phone numbers and current opening status appear only when Google returns them. Listings are not safety-verified. Searching by address requires Geocoding API.
- Voice phrase checks run only in a supported browser while the page is open. A detected phrase never sends automatically; you must confirm the SOS and select any opted-in contacts. A configurable cooldown helps prevent repeated voice-triggered SOS events. Audio capture is user-initiated and remains in browser memory unless downloaded.
- Background hardware triggers, third-party sign-in, administrative analytics, and password reset are not configured.

## Verification

```powershell
npm run build
npm run lint
npm run build --prefix frontend
```

Test Atlas connectivity before attempting signup. Never run database drop/clear commands against the existing database.
