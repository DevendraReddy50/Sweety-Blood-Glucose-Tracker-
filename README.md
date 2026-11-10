# Sweety – Blood Glucose Tracker

A full-stack web application designed for tracking, managing, and analyzing daily blood glucose readings. Built with **Node.js, Express, PostgreSQL, JWT Authentication, React (Vite)**, and **Recharts**.

---

## 📑 Table of Contents
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Project Layout](#project-layout)
- [Installation & Quick Start](#installation--quick-start)
- [Database Setup & Migrations](#database-setup--migrations)
- [Demo Seed Data](#demo-seed-data)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [API Reference](#api-reference)
- [Architectural Notes & Assumptions](#architectural-notes--assumptions)
- [Future Enhancements](#future-enhancements)

---

## 🛠 Tech Stack

- **Backend:** Node.js, Express.js, PostgreSQL (`pg`), `bcryptjs`, JSON Web Tokens (`jsonwebtoken`), `dotenv`
- **Frontend:** React 18 (Vite), React Router v6, Lucide Icons, Recharts, Custom CSS
- **Testing:** Jest, Supertest, `pg-mem` (for fast, deterministic zero-dependency test execution)
- **Containerization:** Docker Compose for PostgreSQL 16

---

## ✨ Key Features

1. **Authentication & Multi-Tenancy:**
   - User registration (`name`, `email`, `password`) with secure `bcrypt` hashing (salt rounds: 10).
   - JWT authentication via `Bearer` tokens stored in browser storage.
   - Strict tenant isolation: users can only view, create, edit, or delete their own glucose readings and reports.

2. **Readings CRUD with Strict Server Validation:**
   - Fields: `date` (`YYYY-MM-DD`), `slot`, `value` in mg/dl.
   - Allowed Slots:
     - `Morning (fasting)`
     - `After breakfast`
     - `After lunch`
     - `After dinner`
   - **Enforced Server Validation Rules:**
     - **Value required:** `"Please enter a glucose value."`
     - **Range & Integer check:** Whole number 40–600 mg/dl &rarr; `"Value must be between 40 and 600 mg/dl."`
     - **One reading per slot per day:** &rarr; `"You already have an <Slot> reading for this date."`
     - **Max 4 readings per day:** &rarr; `"You can add only 4 readings per day."`
     - **Date not in future:** &rarr; `"Date cannot be in the future."`
   - **Database-Level Safety:** PostgreSQL unique constraint `UNIQUE (user_id, date, slot)`.
   - **Edit Re-validation:** Editing safely re-runs validation while excluding the current reading.

3. **Analytics & Aggregated Reports:**
   - Selected date picker with 3 report views:
     - **Daily:** Exact selected date, returns highest, lowest, average (rounded to 1 decimal), count, and chronological list of the day's slot readings.
     - **Month-to-Date (MTD):** 1st of the selected date's month up to the selected date.
     - **Monthly (Previous Month):** The entire previous month relative to the selected date (e.g. For `2026-10-15`: `2026-09-01` to `2026-09-30`).
     - **Edge cases handled:** January rollovers (e.g., `2026-01-15` rolls back to `2025-12-01`–`2025-12-31`) and leap years.
     - Empty states with friendly UI guidance when no data exists.

4. **Bonus Features Implemented:**
   - **Pagination on `GET /readings`:** Supported via `?page=1&limit=20` with responsive pagination controls.
   - **Interactive Recharts Visualization:** Dynamic month-to-date blood glucose trend line chart with target threshold guides (70–140 mg/dl).
   - **Docker Compose:** Pre-configured `docker-compose.yml` for instant PostgreSQL startup.

## 📸 Screenshots

| 1. Authentication (Login / Register) | 2. Dashboard & Readings List |
| :---: | :---: |
| ![Login Page](./screenshots/01_login_page.png) | ![Dashboard Page](./screenshots/02_dashboard_page.png) |
| *One-click "Fill Demo" shortcut with instant JWT auth* | *Color-coded glucose badges & paginated history* |

| 3. Readings CRUD Modal | 4. Reports & Monthly Trend Chart |
| :---: | :---: |
| ![Reading Modal](./screenshots/03_reading_modal.png) | ![Reports Page](./screenshots/04_reports_page.png) |
| *Strict validation (40–600 mg/dl, slot & future date checks)* | *Daily, MTD & Previous Month stats + Recharts trendline* |

---

## 📹 Suggested 2–3 Minute Video Walkthrough Outline

For submission screen recordings (Loom, OBS, or ScreenStudio):
1. **Introduction & Login (0:00 – 0:30):**
   - Open `http://localhost:5173/`. Click **"Fill Demo"** button (`demo@sweety.com` / `Demo@1234`) and sign in.
2. **Dashboard & Readings CRUD (0:30 – 1:15):**
   - Show the readings list with color-coded glucose badges (Normal, Elevated, High, Low).
   - Click **"Log Reading"** to open the modal.
   - Demonstrate validation by typing an invalid value (e.g. `35` or `650`) to show inline error message.
   - Submit a valid reading (e.g. `118` mg/dl).
   - Edit and delete a reading to show real-time table update.
   - Show pagination controls at the bottom (`Showing 1–20 of 170+ readings`).
3. **Reports & Analytics (1:15 – 2:00):**
   - Navigate to the **Reports** tab.
   - Show the 3 report cards: **Daily** (with slot breakdown), **Month-to-Date (MTD)**, and **Previous Month** (with previous month's label).
   - Change the date using the date picker or click **"Yesterday"** to show instant recalculation.
   - Showcase the interactive **Recharts monthly trend chart** with 70–140 mg/dl target reference lines.
4. **Backend Code & Tests (2:00 – 2:30):**
   - Switch to terminal and run `npm test`. Show all 35 tests passing cleanly across the 6 test suites.

---

## 📁 Project Layout

```
project fullstack/
├── .env.example                     # Environment template (root)
├── .gitignore                       # Ignored build & node files
├── docker-compose.yml               # PostgreSQL 16 container definition
├── README.md                        # Documentation & setup guide
├── package.json                     # Orchestrator scripts (dev, test, seed)
├── server/
│   ├── .env.example                 # Backend environment template
│   ├── package.json                 # Express, pg, bcryptjs, jsonwebtoken
│   ├── src/
│   │   ├── app.js                   # Express configuration (exported for Supertest)
│   │   ├── server.js                # Server entry point
│   │   ├── config/
│   │   │   └── db.js                # PostgreSQL connection pool with pg-mem support
│   │   ├── migrations/
│   │   │   ├── 001_init.sql         # Users and readings tables, unique index
│   │   │   └── migrate.js           # SQL migration runner
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT Bearer token authentication
│   │   │   └── errorHandler.js      # Centralized error handler
│   │   ├── controllers/
│   │   │   ├── authController.js    # Auth business logic
│   │   │   ├── readingsController.js# Readings CRUD
│   │   │   └── reportsController.js # Aggregations & statistics
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── readingsRoutes.js
│   │   │   └── reportsRoutes.js
│   │   ├── services/
│   │   │   ├── validationService.js # 5 server validation rules
│   │   │   └── reportsService.js    # Daily, MTD, and Previous Month calculation
│   │   └── seeds/
│   │       └── seed.js              # Demo user generator across last 60 days
│   └── tests/
│       ├── auth.test.js             # Registration, login, password encryption, JWT
│       ├── validation.test.js       # All 5 validation rules & conflict testing
│       ├── readings.test.js         # Readings CRUD & pagination
│       ├── reports.test.js          # Aggregation math & date boundary edge cases
│       ├── isolation.test.js        # Multi-tenant isolation (User A vs User B)
│       └── db.test.js               # Database schema & unique constraint verification
└── client/
    ├── package.json                 # React, Vite, React Router, Recharts, Lucide
    ├── vite.config.js               # Vite config with API proxy
    ├── index.html
    └── src/
        ├── api/                     # API client abstraction with auto-injected JWT
        ├── context/
        │   └── AuthContext.jsx      # Global auth state & persistent session
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ReadingModal.jsx     # Add/Edit reading modal with inline validation
        │   ├── ReportCard.jsx       # Daily, MTD, and Monthly report card
        │   ├── GlucoseChart.jsx     # Recharts trend line chart
        │   └── Pagination.jsx       # Table pagination control
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx    # Readings table CRUD
        │   └── ReportsPage.jsx      # Date picker, report cards, and trend chart
        ├── styles/
        │   └── main.css             # Responsive styling & status badges
        ├── App.jsx                  # Protected routes & client router
        └── main.jsx
```

---

## 🚀 Installation & Quick Start

### 0. Push to Your Public GitHub Repository
To link this codebase to your own public GitHub repository:
```bash
# 1. Create a new public repository on GitHub (e.g. sweety-blood-glucose-tracker)
# 2. Add remote origin and push all commits:
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<YOUR-REPO-NAME>.git
git branch -M main
git push -u origin main
```
The repository already contains clean, atomic conventional commits tracing the step-by-step development history (`feat: auth routes`, `feat: readings validation`, etc.).

---

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+
- PostgreSQL or Docker (optional, tests run with built-in pg-mem emulation)

### 2. Clone and Install Dependencies
Install all backend and frontend dependencies from root:
```bash
# Install backend dependencies
npm --prefix server install

# Install frontend dependencies
npm --prefix client install
```

### 3. Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
Default configuration:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sweety_db
JWT_SECRET=sweety_super_secret_jwt_key_glucose_tracker_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## 🗄 Database Setup & Migrations

### Option A: Using Docker (Recommended)
Start the PostgreSQL container:
```bash
docker compose up -d
```

### Option B: Local PostgreSQL
Create the database in `psql`:
```sql
CREATE DATABASE sweety_db;
```

### Run Migrations
Run the plain SQL migration script:
```bash
npm run migrate
# or inside server:
cd server && npm run migrate
```
This runs `server/src/migrations/001_init.sql`, creating the tables and unique index constraint:
- `users`
- `readings` (with `CONSTRAINT unique_user_date_slot UNIQUE (user_id, date, slot)`)
- Performance index on `(user_id, date)`

---

## 🌾 Demo Seed Data

Generate a ready-to-test demo user with **170+ realistic sample readings** spread across the past 2 months (60 days):
```bash
npm run seed
# or inside server:
cd server && npm run seed
```

### Demo Login Credentials:
- **Email:** `demo@sweety.com`
- **Password:** `Demo@1234`

*(A one-click "Fill Demo" button is also provided on the login page UI)*

---

## 💻 Running the Application

### Start the Backend Server:
```bash
npm run server:dev
# or inside server:
cd server && npm run dev
```
Backend API will be running at `http://localhost:5000`.

### Start the Frontend Client:
In another terminal:
```bash
npm run client
# or inside client:
cd client && npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Running Tests

The test suite contains **35 tests across 6 test suites**, covering 100% of the required functionality:
- All 5 server validation rules
- The database unique-slot constraint
- The max-4 readings per day limit
- Report math (highest, lowest, average rounded to 1 decimal place, count)
- Date range calculations & boundary edge cases (January rollovers, leap years)
- Multi-tenant data isolation (User A cannot view, update, delete, or calculate reports with User B's data)

Run tests:
```bash
npm test
# or inside server:
cd server && npm test
```

Test Results Summary:
```
PASS tests/isolation.test.js
PASS tests/reports.test.js
PASS tests/auth.test.js
PASS tests/validation.test.js
PASS tests/readings.test.js
PASS tests/db.test.js

Test Suites: 6 passed, 6 total
Tests:       35 passed, 35 total
Snapshots:   0 total
Time:        10.347 s
```

---

## 🔌 API Reference

### Auth Routes
- `POST /api/auth/register` - Create account `{ name, email, password }`
- `POST /api/auth/login` - Login `{ email, password }` &rarr; returns `{ user, token }`
- `GET /api/auth/me` - Get authenticated user profile *(Protected)*

### Readings Routes *(All Protected)*
- `GET /api/readings?page=1&limit=20&date=YYYY-MM-DD` - Paginated readings list
- `GET /api/readings/:id` - Fetch single reading
- `POST /api/readings` - Create reading `{ date, slot, value }`
- `PUT /api/readings/:id` - Update reading `{ date, slot, value }`
- `DELETE /api/readings/:id` - Delete reading

### Reports Routes *(Protected)*
- `GET /api/reports?date=YYYY-MM-DD` - Returns:
  - `daily`: `{ highest, lowest, average, count, readings: [...] }`
  - `monthToDate`: `{ highest, lowest, average, count, startDate, endDate }`
  - `monthly`: `{ highest, lowest, average, count, startDate, endDate, label }`

---

## 🧠 Architectural Notes & Assumptions

1. **Date and Timezone Handling:**
   - Blood glucose slots ("Morning (fasting)", "After breakfast", "After lunch", "After dinner") represent contextual daily events rather than absolute UTC timestamps.
   - Dates are explicitly handled as calendar dates (`YYYY-MM-DD`) without UTC conversion shifts. This avoids common timezone drift where an evening reading shifts to the next day depending on timezone offsets.
   - Future date validation compares the submitted `YYYY-MM-DD` against the current local calendar date.

2. **Definition of "Previous Month":**
   - Relative to the selected date `D` (e.g., `2026-10-15`), the "Previous Month" is defined as the full calendar month preceding `D`'s month.
   - For `2026-10-15`: Previous month is `2026-09-01` to `2026-09-30`.
   - For January (e.g., `2026-01-15`): Rollover correctly shifts to December of the prior year (`2025-12-01` to `2025-12-31`).
   - Month boundaries use zero-day leap year safe date calculation (`new Date(Date.UTC(year, month, 0)).getUTCDate()`).

3. **Validation & Race Conditions:**
   - Business rules are checked in `validationService.js` before executing database queries.
   - In addition to service checks, the database enforces `CONSTRAINT unique_user_date_slot UNIQUE (user_id, date, slot)`. If concurrent requests attempt to create duplicate slot readings, the database constraint catches it and translates it into the user-facing error message: `"You already have an <Slot> reading for this date."`

4. **Rounding Specification:**
   - Averages are rounded to 1 decimal place using `Math.round(val * 10) / 10`.
   - Empty states safely return `null` for `highest`, `lowest`, `average`, and `0` for `count`.

---

## 🔮 What I'd Improve with More Time

- **CSV / PDF Export:** Export monthly reports as PDF or CSV for sharing with doctors and endocrinologists.
- **A1C Estimation:** Implement an estimated HbA1c calculator based on the 90-day average glucose formula: $\text{eAG} = (28.7 \times \text{A1C}) - 46.7$.
- **Insulin & Carb Logging:** Add optional companion fields for tracking insulin dosage (units) and carbohydrate intake (grams) for each slot.
- **Push & Email Reminders:** Web Push or email notifications for slots that have not been logged by designated times (e.g., fasting reading reminder at 8:00 AM).
- **Refresh Tokens & Secure HttpOnly Cookies:** Transition JWT storage from `localStorage` to `HttpOnly`, `SameSite=Strict` cookies with a rotating refresh token mechanism.
