# CLAUDE.md — PARA Method Web App

## Project Overview

A full-stack personal knowledge management app implementing the **PARA method** (Projects, Areas, Resources, Archives). Built as an npm workspace monorepo with a React frontend and an Express/SQLite backend.

The UI language is Italian (labels, placeholders, loading text).

## Repository Structure

```
/
├── package.json          # Root workspace config (npm workspaces: client, server)
├── client/               # React 19 SPA (Vite, React Router v7)
│   ├── src/
│   │   ├── api/client.js          # Thin fetch wrapper → api.get/post/put/delete
│   │   ├── hooks/useApi.js        # Data-fetching hook: { data, loading, error, refetch }
│   │   ├── components/
│   │   │   ├── common/            # EmptyState, FilterBar, ItemCard, Modal, QuickCapture, StatusBadge, TagInput
│   │   │   ├── dashboard/         # CategoryWidget, StatsCard
│   │   │   ├── forms/             # AreaForm, ProjectForm, ResourceForm
│   │   │   └── layout/            # AppShell (root layout), Sidebar
│   │   └── pages/                 # Dashboard, Projects, Areas, Resources, Archives
│   └── vite.config.js    # Dev proxy: /api → http://localhost:3001
└── server/               # Express 4 + better-sqlite3
    ├── index.js           # Entry point; mounts routes and error handler
    ├── db/
    │   ├── database.js    # Singleton SQLite connection (WAL mode, FK on)
    │   ├── migrations.js  # Runs schema.sql at startup (idempotent via CREATE IF NOT EXISTS)
    │   └── schema.sql     # Source of truth for all table definitions
    ├── middleware/
    │   └── errorHandler.js  # Reads err.status, returns { error: message }
    ├── routes/            # projects, areas, resources, archives, dashboard
    └── services/
        └── archiveService.js  # archiveItem / restoreItem (both use db.transaction)
```

## Development Workflow

### Prerequisites
- Node.js (any recent LTS)
- npm (workspaces support required, v7+)

### Install
```bash
npm install          # installs both workspaces from root
```

### Run (development)
```bash
npm run dev          # starts both server (nodemon, port 3001) and client (Vite, port 5173) via concurrently
```

### Build (production client)
```bash
npm run build        # runs vite build in client workspace
```

### Run (production server only)
```bash
npm run start        # node index.js in server workspace
```

### Linting
```bash
npm run lint --workspace=client   # ESLint with react-hooks and react-refresh plugins
```

There is no test suite yet.

## Architecture & Key Conventions

### API Layer
- All REST endpoints live under `/api/` (Express router per resource).
- The Vite dev server proxies `/api` to `http://localhost:3001` — no CORS issues in dev.
- Every list endpoint returns `{ data: [...], total: N }`.
- Single-item endpoints return the row directly.
- Errors set `err.status` on the thrown Error and are caught by `errorHandler.js`.

### Database
- Single file `server/para.db` (gitignored) created automatically on first run.
- `better-sqlite3` is used synchronously — no async/await in route handlers.
- `tags` columns are stored as a JSON string (`'[]'` default) and must be serialised with `JSON.stringify` before writes.
- Timestamps (`created_at`, `updated_at`) are Unix epoch integers via `unixepoch()`.
- **Schema changes** go into `schema.sql`. Because migrations only runs `CREATE TABLE IF NOT EXISTS`, new columns require an `ALTER TABLE` statement added to `migrations.js`.

### Archive / Restore Pattern
- Completing or archiving a project/area/resource calls `archiveItem(type, id)` (service layer).
- This is a single SQLite transaction: snapshot the row as JSON into `archives.data`, then delete the original row.
- `restoreItem(archiveId)` reverses the process in one transaction.
- The `archives` table stores `original_type` (`'project'|'area'|'resource'`), `original_id`, and `data` (full JSON snapshot).

### Frontend Patterns
- **`useApi(path, deps)`** — the standard data-fetching hook. Returns `{ data, loading, error, refetch }`. Pass extra `deps` to re-run the query when they change.
- **`api` client** (`src/api/client.js`) — four methods: `get`, `post`, `put`, `delete`. Bodies are auto-serialised; 204 returns `null`.
- **`refreshKey`** in `App.jsx` — a counter incremented on `QuickCapture` save; passed as `key` prop to pages to force a full remount and data refetch.
- **`QuickCapture`** — floating action button (FAB) and keyboard shortcut `c` (when focus is not in an input) opens a modal to quickly create a Project, Area, or Resource.
- **Forms** (`AreaForm`, `ProjectForm`, `ResourceForm`) — used inside `Modal` for both create and edit; receive an optional `initial` prop for editing.

### Routing
Routes are defined in `App.jsx` using React Router v7:

| Path | Page |
|---|---|
| `/` | Dashboard |
| `/projects` | Projects |
| `/areas` | Areas |
| `/resources` | Resources |
| `/archives` | Archives |

`AppShell` is the layout route wrapping all pages via `<Outlet />`.

### Project Status Lifecycle
Projects have three statuses: `active` → `on-hold` → `completed`. Setting status to `completed` via `PUT /api/projects/:id` triggers `archiveItem` instead of updating the row. There is also a dedicated `POST /api/projects/:id/complete` endpoint.

## Important File Locations

| Purpose | Path |
|---|---|
| DB schema | `server/db/schema.sql` |
| DB connection | `server/db/database.js` |
| Archive logic | `server/services/archiveService.js` |
| API fetch wrapper | `client/src/api/client.js` |
| Data-fetching hook | `client/src/hooks/useApi.js` |
| Global styles | `client/src/index.css`, `client/src/App.css` |
| Vite proxy config | `client/vite.config.js` |

## Gotchas

- **Tags are JSON strings in the DB.** Always `JSON.stringify(tags)` before writing and `JSON.parse(row.tags)` when you need an array on the client (the API currently returns raw strings — the client handles this).
- **No ORM.** All SQL is hand-written with `db.prepare(...).run/get/all`. Parameterised queries use positional `?` placeholders.
- **`para.db` is gitignored.** It is created fresh on every new environment by `migrations.js` running at server startup.
- **Italian UI strings.** Keep user-visible labels and placeholder text in Italian to match existing UI conventions.
- **No auth.** This is a single-user local tool — there is no authentication or multi-tenancy.
