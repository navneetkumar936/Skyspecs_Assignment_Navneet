# TurbineOps Lite

Turbine → Inspection → Findings → Repair Plan workflow.

- **Backend:** Node.js, TypeScript, Express, REST (`/api/v1`) and Apollo GraphQL (`/graphql`, read-only)
- **Database:** PostgreSQL via Prisma (primary), MongoDB for the append-only audit log
- **Frontend:** React, TypeScript, Vite
- **Realtime:** Server-Sent Events at `/events`

## Key behavior

- One inspection per turbine per date (database unique constraint, friendly 409).
- Finding severity is 1-5. Crack rule: a `BLADE_DAMAGE` finding with "crack" in its notes is raised to at least 4, and never lowered.
- Repair plan priority: HIGH if max severity is 5, MEDIUM if 3-4, otherwise LOW. Total cost is the sum of finding costs.
- One plan per inspection. Generating a plan **locks** the inspection's findings (no add or edit, 409). Deleting the plan unlocks them.
- Generating or deleting a plan pushes a live update to open browsers (check via multiple screen login).
- Inspections can be filtered by date range, turbine and data source. Finding notes can be searched from the inspection page.

## Run locally

**Prerequisites:** Node 20, PostgreSQL 16 (or Docker). MongoDB is optional locally; audit logging is best-effort and the app runs without it.

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/turbineops?schema=public"
JWT_SECRET="<any long random string>"
MONGO_URL="mongodb://localhost:27017"
```

Create the `turbineops` database first. To use the Docker databases instead, run
`docker compose up -d postgres mongo` and use port **5433** in `DATABASE_URL`
(`postgresql://app:app@localhost:5433/turbineops?schema=public`).

```bash
npx prisma migrate deploy   # create tables
npm run seed                # create users and a sample turbine
npm run dev                 # http://localhost:4000
```

- REST docs (Swagger): http://localhost:4000/api/docs
- GraphQL: http://localhost:4000/graphql (send `Authorization: Bearer <token>`)
- Health: http://localhost:4000/api/healthz

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The dev server proxies `/api`, `/graphql` and `/events` to the backend on port 4000, so start the backend first.

## Seeded users

`npm run seed` creates these users (safe to run repeatedly; it resets their passwords):

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@example.com | admin123 |
| ENGINEER | eng@example.com | engineer123 |
| VIEWER | viewer@example.com | viewer123 |

There is no sign-up; login only. Tokens are JWTs that expire after 1 hour.

## Roles

| Role | Can do |
|---|---|
| ADMIN | Everything: read, create and edit turbines, inspections and findings, generate and delete repair plans |
| ENGINEER | Same write actions as ADMIN accept cannot manage turbine, only view them |
| VIEWER | Read-only. Create, edit and plan buttons are hidden in the UI, and the backend returns 403 on any write |

Permissions are enforced on the backend. The UI only hides actions the role cannot perform.

## Run with Docker Compose

```bash
docker compose up --build
```

| Service | Purpose | Port |
|---|---|---|
| `postgres` | Primary database (with healthcheck and volume) | 5433 on the host |
| `mongo` | Audit log store | 27017 |
| `api` | Backend. On start it runs `prisma migrate deploy`, then the seed, then the server | 4000 |
| `web` | Frontend (built with Vite, served with `vite preview`, proxying `/api`, `/graphql` and `/events` to `api`) | 8080 |

Startup order is enforced with healthchecks: `postgres` and `mongo`, then `api`, then `web`.
Open http://localhost:8080 and log in with a seeded user. Swagger is at http://localhost:8080/api/docs.

- Stop: `docker compose down`. Stop and wipe the databases: `docker compose down -v`.
- `JWT_SECRET` defaults to a demo value. Set your own for anything beyond a demo: `JWT_SECRET=... docker compose up --build`.

## Tests

```bash
cd backend
npm test
```

Backend tests use Jest and Supertest. Services are tested with a mocked database, and routes are tested with mocked services, so no database is needed.

## Documentation

See `docs/`: INSTALL, API, ARCHITECTURE, DB_SCHEMA, TESTING.