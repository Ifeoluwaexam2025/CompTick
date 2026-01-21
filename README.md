# Digital Service Request Management System (DSRMS)

## Overview

Production-grade Node.js/Express/PostgreSQL backend for managing digital service requests with:

- User registration & authentication (JWT)
- Role-based access (USER/ADMIN)
- Service request CRUD, status flow, audit logging
- Input validation, error handling, pagination
- Full test coverage (Jest + Supertest)
- Dockerized, auto-migrating, and ready for CI/CD

## Quick Start

### 1. Clone & configure

```sh
git clone <repo-url>
cd digital-cloud-service
cp .env.example .env
```

### 2. Run with Docker (recommended)

```sh
docker-compose up --build
```

Auto-migration: The app container runs DB migrations on startup, so no manual SQL steps are needed.

### 3. Run locally

```sh
npm install
npm start
```

## API Usage

- Health check: `GET /api/health`
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Requests: `GET/POST/PUT/PATCH /api/requests`
- All `/api/requests` endpoints require JWT in `Authorization: Bearer <token>`

## Testing

```sh
npm test
```

Unit and integration tests for all critical logic and endpoints.

## Recruiter Notes

- Production-quality: Clean architecture, separation of concerns, robust error handling, and security best practices.
- Audit logging: All status changes are tracked in `request_audits`.
- Auto-migration: No manual DB setup required in Docker.
- Ready for CI/CD: Add your favorite pipeline, tests will run out-of-the-box.
- Contact: [your.email@example.com]
