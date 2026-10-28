# Her_Shield

Her_Shield is a React/TanStack safety application with an Express API and MongoDB Atlas persistence.

## Project entry points

- Primary web application: `src/`, served by the root Vite scripts.
- API: `backend/server.js`, run from the backend package.
- `frontend/` is a compatibility entry point for the primary app. Its `dev`, `build`, and `preview` scripts forward to the project root; use the `:legacy` scripts only to run its smaller React Router client.
- `server/` is an older TypeScript backend copy and is not used by the root scripts.

## Run locally

See [QUICK_START.md](./QUICK_START.md) for Windows PowerShell setup, environment configuration, startup commands, and current feature limitations.

The API defaults to port `5000`; the primary Vite app is fixed to port `5173`. The API health/readiness endpoint is `/api/health`. The backend refuses to start without a successful Atlas connection.

## Environment

Configure `backend/.env` locally using `backend/.env.example`. Required names:

- `MONGODB_URI`
- `JWT_SECRET` (at least 32 characters)
- `PORT`
- `CLIENT_URL`

The primary frontend optionally reads `VITE_API_URL` from a root `.env`; its default is the local API URL. The interactive map uses OpenStreetMap tiles and OpenStreetMap nearby-place data; it does not require a Google Maps API key. Browser location is requested only when the user selects **Use my location**. Directions open in Google Maps. Keep server-side credentials, database URIs, and signing secrets out of frontend variables, source code, and documentation. Never commit `.env` files.

## Feature status

Signup/login, profile, contacts, SOS records, journeys, and explicitly saved location data use authenticated MongoDB-backed API endpoints. Confirmed SOS and selected Safe Journey events can request Twilio SMS for contacts with recorded consent; provider delivery is only confirmed when Twilio sends a valid status callback. Journey overdue notices are checked by a server-side scheduler and can be delayed by backend downtime. Nearby searches use OpenStreetMap and the Overpass API; listings and opening information are not safety-verified and may be incomplete or out of date. Voice phrase detection runs only while a supported browser page is open; sending an SOS after a match requires explicit confirmation. Manual audio recording requires browser permission.

Background device triggers, password-reset email, third-party sign-in, police/emergency dispatch, and administrative analytics are not configured. Twilio sender registration, India route eligibility, pricing, and actual delivery have not been verified for a deployment account. The application must not be treated as an emergency response service.

## Validation

```powershell
npm run build
npm run lint
npm run build --prefix frontend
```

Do not run destructive database operations against the existing Atlas database.
