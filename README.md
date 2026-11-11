# Sweety – Blood Glucose Tracker

A full-stack tracker for recording up to four glucose readings per day and reviewing daily, month-to-date, and previous-month reports.

**Stack:** React + Vite, Node.js + Express, PostgreSQL, JWT, bcrypt.

## Repository

[Public GitHub repository](https://github.com/DevendraReddy50/Sweety-Blood-Glucose-Tracker-)

The repository history contains incremental commits. Continue committing changes in small, focused steps.

## Features

- Register and log in; passwords are hashed with bcrypt.
- Create, view, edit, and delete readings for Morning (fasting), After breakfast, After lunch, and After dinner.
- Enforce whole-number values from 40 to 600 mg/dl, one reading per slot per day, a four-reading daily maximum, and no future dates.
- Restrict readings and reports to the authenticated user.
- Daily, month-to-date, and previous-month statistics (highest, lowest, average, and count); the daily report lists readings by slot.
- Paginated reading history and a month-to-date trend chart.

## Requirements

Node.js 18 or later, npm, and Docker Desktop (for PostgreSQL or the full Compose stack).

## Install and run locally

1. Copy `.env.example` to `.env`. Set a private `JWT_SECRET` for non-demo use. `VITE_API_BASE_URL=/api` uses the Vite proxy for local development.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install packages: `npm run install:all`.
4. Apply the database schema: `npm run migrate`.
5. In one terminal run `npm run server:dev`; in another run `npm run client`.
6. Open http://localhost:5173.

The API listens on port 5000. Vite forwards `/api` requests to it. To stop PostgreSQL, run `docker compose down`.

## Run the full app with Docker Compose

Copy `.env.example` to `.env`, set `JWT_SECRET`, then run `docker compose up --build`. Compose starts PostgreSQL, applies the migration, starts the API, and serves React at http://localhost:5173. The API health endpoint is http://localhost:5000/api/health.

## Demo data

Run `npm run seed` after starting PostgreSQL. The idempotent seed creates a demo account and sample readings across the prior 60 days.

- Email: `demo@sweety.com`
- Password: `Demo@1234`

## Tests

Run backend tests with `npm test` from the project root. Tests use pg-mem and do not require PostgreSQL. The suite covers authentication, reading validation and CRUD, reports, database behavior, and user isolation.

## Screenshots

| Login | Readings dashboard |
| --- | --- |
| ![Login screen](./screenshots/01_login_page.png) | ![Dashboard](./screenshots/02_dashboard_page.png) |

| Reading form | Reports |
| --- | --- |
| ![Reading form](./screenshots/03_reading_modal.png) | ![Reports and chart](./screenshots/04_reports_page.png) |

These screenshots were captured from the running app. A live screen recording can be added when captured.

## Environment variables

See [.env.example](./.env.example) for the complete variable list. Compose uses the internal PostgreSQL hostname for the API database connection.

## Notes

- Assumption: each user may have at most one reading in each of the four named slots per calendar date; the database and API enforce slot uniqueness and the API enforces the daily limit.
- Seed values are generated demo data, not medical advice or patient data.
- With more time, add React Testing Library coverage, improve production secret management and deployment configuration, and capture a live end-to-end walkthrough.
