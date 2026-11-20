# ESSU-Salcedo School Supplies Inventory Monitoring System

A full-stack, database-connected inventory and digital requisition system for **Eastern Samar State University (ESSU) – Salcedo Campus**, developed according to the research paper `wedsadsad.docx` (Group 5, CpE 315).

The system replaces paper ledgers and spreadsheets with centralized stock tracking, role-based access, digital supply requests, automated low-stock alerts, transaction logs, audit trails, and reports. Scope is limited to consumable classroom supplies, office stationery, and similar consumables — no fixed assets, financial accounting, vendor procurement, student portals, or general faculty portals.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | Vue 3, Vite, Vue Router, Pinia, Axios, Chart.js, jsPDF, HTML5, CSS3 (JavaScript only) |
| Backend | Node.js, Express 5, REST API, JWT, bcrypt, express-validator, express-rate-limit, Helmet |
| Database | MongoDB Atlas (Mongoose ODM), replica-set transactions where available, atomic conditional updates |
| DevOps | Docker, Docker Compose, Git/GitHub, GitHub Actions ready |

## User roles

| Role group | Roles | Access |
| --- | --- | --- |
| Custodian / Supply Officer | `CUSTODIAN`, `SUPPLY_OFFICER` | Dashboard, inventory CRUD, supply requests, stock transactions, alerts, audit logs, reports, user management, profile |
| Dean / Program Head | `DEAN`, `PROGRAM_HEAD` | Dashboard, browse inventory, new supply request, own requests, request history, profile |

RBAC is enforced on both the Vue router and every protected API endpoint. Deans can only read their own requests from the database layer.

## Project structure

```
school-inventory-system/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/styles.css
│   │   ├── components/         # Sidebar, topbar, tables, modals, badges, charts, icons
│   │   ├── layouts/            # Dashboard and auth layouts
│   │   ├── router/             # Guarded routes
│   │   ├── stores/             # Pinia stores (auth, UI, notifications)
│   │   ├── services/           # Axios API client and endpoint modules
│   │   ├── utils/              # Formatting, constants, navigation, CSV/PDF export
│   │   ├── views/auth/         # Login
│   │   ├── views/custodian/    # Administrative modules
│   │   ├── views/dean/         # Requisitioner modules
│   │   ├── views/shared/       # Profile, 404
│   │   ├── App.vue
│   │   └── main.js
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/                 # Environment and MongoDB connection
│   ├── controllers/            # Request handlers
│   ├── middleware/             # Auth, RBAC, validation, rate limit, errors
│   ├── models/                 # User, InventoryItem, SupplyRequest, StockTransaction,
│   │                           # Notification, AuditLog, Counter, RevokedToken
│   ├── routes/                 # REST endpoints
│   ├── scripts/seed.js         # Secure first-custodian bootstrap
│   ├── services/               # Audit, notification, numbering, stock workflow
│   ├── tests/                  # Integration tests (node:test + supertest)
│   ├── utils/                  # Errors, pagination, validators, constants
│   ├── .env.example
│   ├── app.js
│   ├── server.js
│   └── package.json
├── .github/workflows/ci.yml
├── docker-compose.yml
├── render.yaml
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 18+ (Node 22 recommended) and npm
- A MongoDB Atlas account (free M0 cluster is sufficient)
- Git (optional)
- Docker Desktop with Compose (only for container deployment)
- VS Code (recommended editor)

## 1. Install dependencies

```powershell
cd school-inventory-system\backend
npm install

cd ..\frontend
npm install
```

## 2. Configure environment variables

Never commit `.env` files. Only `.env.example` files are tracked.

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and set:

```env
PORT=5000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.example.mongodb.net/essu_inventory?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=12h
CLIENT_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=8
```

Generate a strong JWT secret, for example in PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

For a deployed frontend, set this to the public API URL. No database URI or JWT secret ever goes into frontend configuration.

## 3. MongoDB Atlas setup

1. Create an Atlas account and a cluster (M0 free tier works).
2. Create a **Database User** with a strong password and read/write access to the `essu_inventory` database.
3. Under **Network Access**, allow your current IP address (or `0.0.0.0/0` only for a controlled demo deployment) and allow the deployment host/IP.
4. Open **Connect → Drivers → Node.js**, copy the SRV connection string, and replace `USERNAME`, `PASSWORD`, and the database name with `essu_inventory`.
5. Paste the final string into `MONGODB_URI` in `backend/.env`.
6. Atlas clusters are replica sets, so multi-document features work. The application also uses conditional atomic updates so stock can never go negative or be deducted twice.

Indexes are created automatically by the Mongoose models on first connection (unique usernames, item codes, request numbers, transaction IDs, and query indexes).

## 4. Create the first Property Custodian account

Public registration does not exist. After configuring `MONGODB_URI`, run the bootstrap script from `backend/`. The password is entered interactively and hidden:

```powershell
npm run seed -- --full-name "Ana Custodian" --username custodian --department "Supply Office"
```

Alternative (non-interactive, e.g. CI):

```powershell
$env:SEED_FULL_NAME = "Ana Custodian"
$env:SEED_USERNAME = "custodian"
$env:SEED_DEPARTMENT = "Supply Office"
$env:SEED_PASSWORD = "ChooseAStrongPassword1"
npm run seed
```

The script refuses to run if an administrative account already exists. Afterwards, sign in and use **User Management** to create Deans, Program Heads, and additional Supply Officers. User passwords are hashed with bcrypt (cost 12).

## 5. Run the application locally

Terminal 1 — backend:

```powershell
cd backend
npm run dev
```

Terminal 2 — frontend:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. API health check: `http://localhost:5000/api/health`.

Production-style local run:

```powershell
cd backend
npm start

cd ..\frontend
npm run build
npm run preview
```

## 6. Docker deployment

From the project root:

```powershell
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

`docker-compose.yml` reads `backend/.env` and passes `VITE_API_BASE_URL` as a build argument. In production, put both services behind a TLS-terminating reverse proxy so all traffic is served over HTTPS, as required by the research paper. For a remote deployment, change `CLIENT_ORIGIN` and `VITE_API_BASE_URL` to the public HTTPS URLs before building.

For a quick public deployment, `render.yaml` is a Render Blueprint defining the API web service and frontend static site. Push the repository to GitHub, choose **New Blueprint Instance** in Render, select this repository, and enter the MongoDB Atlas `MONGODB_URI` when prompted. Render generates `JWT_SECRET` and provides HTTPS URLs; if your service names differ, update `CLIENT_ORIGIN` and `VITE_API_BASE_URL` in the Render dashboard. After deployment, open the Render Shell for the API service and run `npm run seed` once to create the first custodian.

## 7. Testing

Automated integration tests use an in-memory MongoDB instance, so no Atlas credentials are needed:

```powershell
cd backend
npm test
```

The suite covers login/invalid credentials, token expiry/revocation, RBAC denials, inventory CRUD/search/filter/archive, low-stock alerts, request submission and stock validation, approval/rejection with remarks, fulfillment with single stock deduction, duplicate fulfillment prevention, stock-in, notifications, dashboard statistics, reports, and immutable audit logs.

Frontend production build check:

```powershell
cd frontend
npm run build
```

`.github/workflows/ci.yml` runs both commands on every push and pull request to `main`/`master`.

### Manual verification checklist

1. Log in as the custodian; confirm the dashboard cards and charts show database values.
2. Add an item, edit it, search/filter it, and archive it (historical records remain).
3. Record a STOCK_IN transaction and verify quantity and transaction history.
4. Create a Dean/Program Head account in User Management.
5. Log in as the Dean; browse stock and submit a multi-item request. Confirm the custodian receives a notification.
6. Confirm the Dean cannot open `/custodian/*` routes or call admin APIs.
7. As custodian, reject a request without remarks (blocked), then reject with remarks, approve another, and fulfill it.
8. Verify stock is deducted exactly once, a STOCK_OUT transaction exists, and the requester receives a notification.
9. Lower a quantity to the reorder level / zero and verify low-stock / out-of-stock alerts (no duplicates while active).
10. Check Audit Logs for login, inventory, request, fulfillment, stock-in, and user actions; confirm no edit/delete controls exist.
11. Generate each of the eight reports, apply filters, print, and export CSV/PDF.
12. Refresh the browser and confirm all changes persist.

## 8. REST API summary

All routes except `/api/auth/login` require `Authorization: Bearer <token>`. Admin-only routes require a Custodian/Supply Officer role.

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/auth/login` | Public (rate limited) |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/auth/me` | Authenticated |
| PATCH | `/api/auth/password` | Authenticated |
| GET/POST | `/api/users` | Admin |
| PUT | `/api/users/:id` | Admin |
| PATCH | `/api/users/:id/status` | Admin |
| PATCH | `/api/users/:id/password` | Admin |
| GET | `/api/inventory`, `/api/inventory/options` | All roles |
| GET/POST | `/api/inventory`, `/api/inventory/:id` | GET all, mutations admin |
| PUT/DELETE | `/api/inventory/:id` | Admin (soft delete/archive) |
| GET/POST | `/api/requests` | GET all (own for deans), POST requesters |
| PATCH | `/api/requests/:id/approve`, `/reject`, `/fulfill` | Admin |
| GET | `/api/transactions` | All roles |
| POST | `/api/transactions/stock-in` | Admin |
| GET | `/api/notifications`, `/api/notifications/unread-count` | Authenticated |
| PATCH | `/api/notifications/:id/read`, `/read-all` | Authenticated |
| GET | `/api/reports/inventory`, `/transactions`, `/consumption`, `/requests`, `/metadata` | Admin |
| GET | `/api/audit-logs` | Admin |
| GET | `/api/dashboard` | All roles (role-aware payload) |

Successful list responses include `pagination: { total, page, limit, pages }`. Errors use `{ success: false, error: { message, details? } }`.

## 9. Security and workflow notes

- Passwords are bcrypt hashes; JWTs carry a `jti` and expire (`JWT_EXPIRES_IN`). Logout revokes the token server-side; inactive accounts are rejected on every request.
- Login is rate limited; Helmet sets security headers; CORS only accepts `CLIENT_ORIGIN`.
- All write operations are validated with express-validator, and inventory deletion is a soft archive that preserves transaction/request history.
- Fulfillment claims the request with an atomic status transition, then deducts each item with a conditional `quantity >= requested` update and rolls back on failure. Stock cannot become negative and cannot be deducted twice.
- Low-stock/out-of-stock alerts are deduplicated per item while active and resolved automatically when stock recovers.
- Audit logs are append-only (Mongoose hooks reject updates/deletes) and there are no API endpoints to modify them.
- No credentials or secrets are stored in the frontend. `.env` files are ignored by Git.

## 10. Troubleshooting

- **Cannot connect to MongoDB**: verify Atlas Network Access and that `MONGODB_URI` includes the correct username, password, and database name. Special characters in passwords must be URL-encoded.
- **CORS error in browser**: `CLIENT_ORIGIN` must exactly match the frontend origin (including port), e.g. `http://localhost:5173`.
- **Token expires**: the user is redirected to login, and the expired session is rejected server-side.
- **`JWT_SECRET is too short` in production**: use a random secret of at least 32 characters.
- **No data appears**: the system intentionally ships without sample records. Add items through Inventory Management and create accounts through User Management.
