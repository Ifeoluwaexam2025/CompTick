# Digital Service Request Management System (DSRMS)

**A REST API for managing digital service requests, built with Node.js, Express and PostgreSQL.**

[Source Code](https://github.com/Ifeoluwaexam2025/Digital-CloudService)

## Overview

DSRMS is a backend software project exploring how service requests can be created, managed and tracked through a structured workflow.

The application supports user accounts, JWT-based authentication, role-based permissions, request management and audit records.

I built this project to develop practical experience with backend architecture, relational databases, API design, authentication and automated testing.

**Technology:** Node.js · Express · PostgreSQL · JavaScript · JWT · bcrypt · Jest · Supertest · Docker

## Features

### Authentication and authorization

- User registration and login
- Password hashing using bcrypt
- JWT authentication for protected endpoints
- USER and ADMIN roles
- Request ownership checks for editing

### Service request management

- Create service requests with a title, description, category and priority
- Update requests owned by the authenticated user
- List requests with page and limit parameters
- Restrict ordinary users to their own requests
- Allow administrators to change request status

### Workflow and audit history

Requests follow this status progression:

`OPEN → IN_PROGRESS → RESOLVED`

Status changes are restricted to administrators and recorded in the `request_audits` database table.

Each audit record includes the request, previous status, new status, acting user, optional note and timestamp.

### Database and development tooling

- PostgreSQL tables linked through foreign keys
- Parameterized queries for database operations
- Schema constraints for valid roles, priorities and statuses
- Database-generated UUIDs and timestamps
- Docker configuration for the application and database
- Jest and Supertest for automated API testing

## API endpoints

Base URL for local development: `http://localhost:3000`

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| GET | `/api/health` | Check API health | Public |
| POST | `/api/auth/register` | Register a user | Public |
| POST | `/api/auth/login` | Log in and receive a JWT | Public |
| GET | `/api/requests` | List accessible requests | JWT |
| POST | `/api/requests` | Create a request | JWT |
| PUT | `/api/requests/:id` | Update an owned request | JWT |
| PATCH | `/api/requests/:id/status` | Change request status | ADMIN |

**Note:** A delete endpoint is not currently implemented.

## Example API workflow

The examples below illustrate the intended request flow. They require a running API and initialized PostgreSQL database.

### 1. Register a user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "example-password",
    "role": "USER"
  }'
```

### 2. Log in

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "example-password"
  }'
```

A successful login returns a JWT:

```json
{
  "token": "<jwt-token>"
}
```

### 3. Create a service request

Replace `<jwt-token>` with the token returned at login.

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "title": "Unable to access service portal",
    "description": "The portal does not load after login.",
    "category": "ACCESS",
    "priority": "HIGH"
  }'
```

New requests start with the status `OPEN`.

### 4. Retrieve requests

```bash
curl "http://localhost:3000/api/requests?page=1&limit=10" \
  -H "Authorization: Bearer <jwt-token>"
```

Ordinary users can retrieve their own requests. Administrators are intended to retrieve requests across users.

### 5. Update request status

An administrator can move a request from `OPEN` to `IN_PROGRESS`, then to `RESOLVED`.

```bash
curl -X PATCH \
  http://localhost:3000/api/requests/<request-id>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -d '{
    "status": "IN_PROGRESS",
    "note": "Investigation started"
  }'
```

The service enforces the supported status sequence and creates an audit record for changes.

## Project architecture

The codebase separates HTTP routing, request handling, business logic and database access.

```text
src/
├── app.js
├── index.js
├── config/
├── middleware/
├── modules/
│   └── auth/
│       ├── auth.routes.js
│       ├── auth.controller.js
│       ├── auth.service.js
│       └── auth.validation.js
├── requests/
│   ├── request.routes.js
│   ├── request.controller.js
│   ├── request.service.js
│   └── request.validation.js
└── utils/

migrations/
└── 001_create_schema.sql

Dockerfile
docker-compose.yml
package.json
```

### Request processing flow

`HTTP Request → Route → Authentication/Authorization → Controller → Validation → Service → PostgreSQL`

**Routes** define the available API endpoints.

**Middleware** verifies JWTs and enforces access permissions.

**Controllers** handle incoming requests, validation and responses.

**Services** implement request creation, updates, status changes and database queries.

**PostgreSQL** stores users, service requests and audit records.

This separation makes it easier to locate functionality and test individual parts of the backend.

## Database design

The database uses three main tables.

| Table | Purpose |
|---|---|
| `users` | Account information, password hashes and roles |
| `service_requests` | Request details, priority, status, ownership and assignment fields |
| `request_audits` | History of status changes and the responsible user |

Foreign keys connect requests to users and audit records to their corresponding requests.

The schema also includes indexes and database triggers that update modification timestamps.

## Testing

The project uses:

- **Jest** as the JavaScript testing framework
- **Supertest** for HTTP endpoint testing

To run the test suite:

```bash
npm test
```

The testing setup is intended to cover authentication, authorization, service-request operations and error scenarios.

A verified coverage percentage and automated CI results have not yet been published.

## Local setup

### Requirements

- Node.js and npm
- PostgreSQL
- Docker and Docker Compose (optional)

### Install dependencies

```bash
git clone https://github.com/Ifeoluwaexam2025/Digital-CloudService.git
cd Digital-CloudService
npm install
```

### Configure the environment

Copy the example environment file:

```bash
cp .env.example .env
```

Update the database connection settings and JWT secret for your environment.

The example values are for local development only.

### Initialize the database

Create the configured PostgreSQL database and apply:

`migrations/001_create_schema.sql`

### Start the application

```bash
npm start
```

For development with automatic restarting:

```bash
npm run dev
```

The application is configured to run on port 3000 by default.

**Current setup limitation:** The Docker startup process and declared dependencies require fixes before a reliable one-command setup can be guaranteed. See the improvement roadmap below.

## Engineering decisions

### Separate controllers from services

Request handlers and database operations are implemented in separate modules.

This makes the responsibilities clearer and helps prevent HTTP-specific code from becoming mixed with database operations.

### Use JWTs for API authentication

Protected endpoints verify a token before permitting access to service requests.

Role checks add authorization rules for administrator-only operations.

### Track request status changes

An audit table provides a record of changes to request status.

This is useful when understanding who changed a request and how it moved through its workflow.

### Use PostgreSQL constraints

The database enforces valid values for roles, statuses and priorities, in addition to application-level checks.

This gives the data model another validation layer.

## Limitations and improvement roadmap

The project demonstrates a backend architecture but is not yet hardened for production deployment.

Planned improvements include:

- Preventing public registration from assigning administrator privileges
- Fixing the request-list pagination query for all user roles
- Making status changes and audit insertion atomic through database transactions
- Improving Docker startup and migration handling
- Resolving dependency configuration issues
- Expanding automated test coverage and publishing verified results
- Adding a CI pipeline for automated validation
- Strengthening production security configuration and error handling

## What I learned

This project helped me practice:

- Structuring an Express application into responsibilities
- Designing REST endpoints and authorization rules
- Modeling related data in PostgreSQL
- Implementing JWT authentication and password hashing
- Tracking changes through audit records
- Thinking about validation, reliability and testing
- Working with container-based development environments

It also highlighted the importance of reviewing implementation details instead of assuming a feature is reliable simply because its code exists.

## Author

**Ifeoluwa Ogungbemi**

Information Technology Engineering Student — Oulu University of Applied Sciences

[GitHub](https://github.com/Ifeoluwaexam2025) · [LinkedIn](https://www.linkedin.com/in/ifeoluwa-ogungbemi-39083b363)
