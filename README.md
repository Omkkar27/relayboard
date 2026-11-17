# Reverse Proxy TS

Reverse Proxy TS is a TypeScript HTTP reverse proxy with path/host routing, upstream health checks, request and response header transforms, and a small runtime route-management API. The repository also contains the Relayboard Next.js dashboard for inspecting and managing the proxy.

## Requirements

- Node.js 18 or newer
- npm
- An HTTP upstream service to proxy to
- MongoDB only if you use Relayboard authentication

## Install

```bash
npm install
```

## Run the standalone proxy

The proxy loads `config.json` by default and listens on port `3100`:

```bash
npm run dev:proxy
```

Use a different configuration file by passing its path to the CLI:

```bash
npm run dev:proxy -- ./config.json
```

For a production-style run, compile first and then start the compiled server:

```bash
npm run build:proxy
npm run start:proxy
```

Set `PORT` to change the listening port:

```bash
PORT=3200 npm run dev:proxy
```

## Configuration

The configuration file must contain at least one route. Routes are evaluated against the incoming host and/or path prefix.

```json
{
  "routes": [
    {
      "match": { "pathPrefix": "/api" },
      "upstream": "http://localhost:4000",
      "stripPrefix": true,
      "healthCheck": {
        "path": "/health",
        "intervalMs": 15000
      }
    }
  ]
}
```

Each route supports:

- `match.host` and/or `match.pathPrefix` to select requests
- `upstream` as the destination URL
- `stripPrefix` to remove the matched path prefix before forwarding
- `addRequestHeaders` and `removeRequestHeaders`
- `addResponseHeaders` and `removeResponseHeaders`
- `healthCheck.path` and optional `healthCheck.intervalMs`

## Proxy and management endpoints

The proxy forwards matching requests and returns `404` when no route matches. It returns `502` when the selected upstream is unhealthy or forwarding fails.

Management endpoints are available on the same server:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/_proxy/routes` | List configured routes and upstream health |
| `POST` | `/_proxy/routes` | Add a route at runtime |
| `DELETE` | `/_proxy/routes/:index` | Remove a route by index |
| `GET` | `/_proxy/health` | Summarize upstream health |
| `GET` | `/api/summary` | Summarize proxy status and route counts |

Runtime route changes are kept in memory and are lost when the process restarts.

## Run Relayboard

Relayboard is the Next.js dashboard included in this project:

```bash
npm run dev
```

Open `http://localhost:3000`.

Authentication uses MongoDB, bcrypt, and a JWT-backed HTTP-only session cookie. Configure the connection string and token secret in `.env` or `.env.local` before using signup/login. The exact variable names are read from `lib/db.ts` and `lib/session.ts`.

## Validation and tests

```bash
npm run typecheck
npm test
npm run build
```

The proxy implementation is in `src/`; tests are in `tests/`; the dashboard and API routes are in `app/` and `components/`.
