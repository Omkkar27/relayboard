# Relayboard

Relayboard is a Next.js control plane for the TypeScript reverse proxy in this repository. It provides a calm dashboard for inspecting routes, checking upstream status, and adding or removing path-based routes.

## Run locally

Start the Next.js app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Authentication

Relayboard now includes cookie-based signup, login, logout, and protected dashboard access. Copy `.env.example` to `.env.local`, set a MongoDB connection string and a strong `TOKEN_SECRET`, then restart Next.js. The dashboard redirects unauthenticated visitors to `/login`.

The session cookie is `httpOnly`, uses `sameSite=lax`, and is marked secure in production. Passwords are hashed with bcrypt before storage.

The original proxy engine is still available independently:

```bash
npm run dev:proxy
```

It listens on `http://localhost:3100` by default. Set `PORT` to change it.

## Checks

```bash
npm run typecheck
npm run build
npm test
```

The Next API routes live under `app/api`, the dashboard is in `components/Dashboard.tsx`, and the small in-memory control-plane store is in `lib/proxy-store.ts`.
