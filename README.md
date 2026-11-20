# Digital Service Request Management System

DSRMS is a REST API for submitting and tracking digital service requests. Users can create and edit their own requests. Administrators can review all requests and advance them through a workflow that records who made each status change.

I built this project as an Information Technology Engineering portfolio project to practice backend development, relational data modeling, authorization and automated testing. [Digital Cloud Service on GitHub](https://github.com/Ifeoluwaexam2025/Digital-CloudService)

**Stack** · Node.js 26 LTS, Express 4, PostgreSQL, CommonJS, bcrypt, JWT, Jest, Supertest, Docker Compose and GitHub Actions. [Node.js release schedule](https://nodejs.org/en/about/previous-releases)

## Architecture

```text
HTTP request → Express route → authentication and role checks
            → controller and validation → service → repository → PostgreSQL
```

- `src/app.js` configures Express and the JSON API. `src/index.js` checks the database schema before opening the HTTP port.
- `src/modules/auth/` handles account creation and login. Public registration accepts an omitted role or `USER`, and the SQL insert fixes the role to `USER`. Bcrypt hashes the password before persistence.
- `src/middleware/` verifies the signed credential, loads the current active account and enforces route permissions. Login issues an HS256 JWT valid for one hour. Fetching the role from PostgreSQL on each protected request applies role changes and account deactivation to subsequent requests at the cost of one read.
- `src/requests/` separates input validation, workflow rules and SQL. The owner predicate is part of the edit query. A missing or unowned request returns the same 404 response, so edits reveal no ownership information.
- `src/config/` manages the PostgreSQL pool, explicit transactions and versioned migrations.

## Database model and workflow

| Table | Stored data |
| --- | --- |
| `users` | UUID, unique email, bcrypt hash, role, active flag and timestamps |
| `service_requests` | UUID, title, description, category, priority, status, owner, optional assignee and timestamps |
| `request_audits` | UUID, request, acting user, old status, new status, note and timestamp |
| `schema_migrations` | Applied migration filenames and timestamps |

Foreign keys link requests to users and audits to both. The database constrains roles, priorities and request statuses, and triggers maintain modification timestamps.

Requests start at `OPEN`. An administrator can advance a request through `OPEN → IN_PROGRESS → RESOLVED`. The service locks the request row with `SELECT … FOR UPDATE`, validates the current state, and writes the status and audit using the same PostgreSQL connection. Both writes commit together. An audit failure rolls back the status update. A concurrent attempt waits for the row lock and evaluates the transition against the newly committed status.

## API

Local base URL · `http://127.0.0.1:3000`

| Method and path | Access | Success |
| --- | --- | --- |
| `GET /api/health` | Public | 200 with API liveness status and timestamp |
| `POST /api/auth/register` | Public | 201 with account ID, email and role |
| `POST /api/auth/login` | Public | 200 with JWT |
| `GET /api/requests` | Authenticated | 200 with the caller’s requests, or all requests for an administrator |
| `POST /api/requests` | Authenticated | 201 with the new `OPEN` request |
| `PUT /api/requests/:id` | Request owner | 200 with updated title, description, category and priority |
| `PATCH /api/requests/:id/status` | Administrator | 200 with the updated request |
| `GET /api/requests/:id/audits` | Administrator | 200 with a page of status changes for the request |

Send JSON for writes and `Authorization: Bearer $TOKEN` on protected routes. Registration requires an email and a password with at least 8 characters and at most 72 UTF-8 bytes. Request creation and editing require nonblank title, description and category and a priority of `LOW`, `MEDIUM` or `HIGH`. Status updates require a supported status and accept an optional note of up to 2,000 characters.

Listing accepts `page` and `limit`, which default to 1 and 10. The maximum limit is 100. Results are ordered by newest creation time, with descending UUID as a tie-breaker. The response remains a JSON array. Inserts between page loads can shift offset-based results.

Audit history accepts the same `page` and `limit` parameters. It returns a JSON array sorted by descending `changed_at`, then descending audit `id` for timestamp ties. Each entry contains `id`, `old_status`, `new_status`, `changed_at`, `changed_by` (the administrator’s UUID) and `note` (which may be empty or null). An existing request with no entries on the requested page returns `[]`. A valid UUID for a missing request returns 404.

Errors have the shape `{"message":"Invalid credentials"}`. Common statuses are 400 for invalid input, 401 for invalid credentials or tokens, 403 for insufficient role, 404 for a missing or unowned resource, and 409 for duplicate email or a disallowed transition. Unexpected errors return a generic 500 response.

### Example workflow

Register a development account.

```bash
curl -sS http://127.0.0.1:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"example-password"}'
```

Example response.

```json
{
  "id": "f004ec3d-da2c-48ae-b4c7-5213dccd8de6",
  "email": "demo@example.com",
  "role": "USER"
}
```

Log in, extract the JWT, and create a request.

```bash
TOKEN=$(curl -fsS http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"example-password"}' |
  node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).token')

curl -fsS http://127.0.0.1:3000/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Portal access","description":"Cannot sign in","category":"ACCESS","priority":"HIGH"}'

curl -fsS 'http://127.0.0.1:3000/api/requests?page=1&limit=10' \
  -H "Authorization: Bearer $TOKEN"
```

An administrator can send the following request using an authorized token and an existing request UUID.

```bash
curl -fsS -X PATCH "http://127.0.0.1:3000/api/requests/$REQUEST_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"IN_PROGRESS","note":"Investigation started"}'
```

To read the status history for that request:

```bash
curl -fsS "http://127.0.0.1:3000/api/requests/$REQUEST_ID/audits?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Run locally

Install Node.js 26 and PostgreSQL 14. Create an empty database and a PostgreSQL user with permission to create tables and related objects in its schema. Then run:

```bash
git clone https://github.com/Ifeoluwaexam2025/Digital-CloudService.git
cd Digital-CloudService
npm ci
cp .env.example .env
node -p 'require("node:crypto").randomBytes(32).toString("hex")'
```

Put the generated value in `JWT_SECRET` and fill in the database connection settings in `.env`.

```bash
npm run migrate
npm start
curl -fsS http://127.0.0.1:3000/api/health
```

Use `npm run dev` for automatic restart during development. Run migrations explicitly when updating the schema. The migration runner takes an advisory lock and records applied files transactionally. The bootstrap migration supports the original DSRMS schema and preserves its rows. Keep future changes in new numbered SQL files. For a database with custom schema changes, verify the schema before adoption. For previously running installations, review existing administrator accounts and set a new JWT signing secret before exposing the updated API. Existing accounts with passwords longer than 72 UTF-8 bytes need an operator-assisted password reset.

| Variable | Purpose |
| --- | --- |
| `PORT` | Local HTTP port, defaults to 3000 |
| `DB_HOST`, `DB_PORT` | PostgreSQL host and port, with port 5432 by default |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Target database and credentials |
| `JWT_SECRET` | Random signing secret, at least 32 bytes |
| `TEST_DATABASE_URL` | PostgreSQL connection URI for a dedicated test database |

### Docker Compose

Copy `.env.example` to `.env`, set a database user, a database name, a database password and a random JWT secret, then run:

```bash
docker compose up --build
```

Compose waits for healthy PostgreSQL, runs migrations as a one-shot service, and starts the API after a successful migration. The database uses the `db_data` named volume. Existing volumes retain the credentials and database created when they were initialized. Use matching `DB_*` values with an existing volume. `docker compose down` keeps the named volume. Docker startup is currently unverified on the machine used for the backend checks.

### Provision a development administrator

Register the intended account first. A trusted database operator can promote that account using an authenticated PostgreSQL session connected to the configured database. With Compose, open that session using `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`. Inside PostgreSQL, use the intended account’s email:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'demo@example.com' AND is_active = TRUE
RETURNING id, email, role;
```

A successful update returns one row. Use the account’s JWT for administrator calls. Public requests have no role-management endpoint.

## Tests and verification

The full suite needs a dedicated PostgreSQL test database. For local testing with Docker, start a disposable database on port 55432:

```bash
docker run --rm -d --name dsrms-test-db -p 127.0.0.1:55432:5432 \
  -e POSTGRES_USER=dsrms_test -e POSTGRES_PASSWORD=disposable-test \
  -e POSTGRES_DB=dsrms_test postgres:14
cp -n .env.test.example .env.test
docker exec dsrms-test-db pg_isready -h 127.0.0.1 -U dsrms_test -d dsrms_test
npm test
```

Wait for `pg_isready` to report that PostgreSQL is accepting connections before running the tests. To remove the disposable container after testing, run `docker stop dsrms-test-db`.

With an existing PostgreSQL server, create a separate test database and set its connection URI in `.env.test`. The test role needs permission to create schemas in that database. A shell or CI value for `TEST_DATABASE_URL` takes precedence over the file. Integration suites create and remove randomly named schemas and apply the application migrations. `npm run test:unit` and `npm run lint` work without PostgreSQL.

Use `npm run test:integration` for the HTTP suites. Node.js 26.13.0 and PostgreSQL 14.25 were used for local verification. The full run passed 33 tests across five suites. The checks include forced audit rollback, concurrent status changes, audit history access and ordering, ownership, pagination, malformed JSON, and authentication failures. A separate smoke check applied migrations twice to the original schema, preserved existing data, and started the API successfully.

## Limitations and next steps

The API currently exposes a liveness check and stores audit history in PostgreSQL. Assignment, deletion and token refresh have no public endpoints. Login has no application-level rate limiting. The application and migrations share database credentials in the local Compose stack.

Audit history uses offset pagination, so new status changes can shift entries between page loads.

## Author

**Ifeoluwa Ogungbemi** · Information Technology Engineering student, Oulu University of Applied Sciences. [GitHub](https://github.com/Ifeoluwaexam2025) · [LinkedIn](https://www.linkedin.com/in/ifeoluwa-ogungbemi-39083b363)
