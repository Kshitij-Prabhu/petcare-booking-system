# Pet-Care Service Booking & Tracking System

DBMS Level 3 Experiential Learning Project — Department of CSE

**Team**
- Kshitij Prabhu — PES1UG24CS914
- Ashwin Venkatesh — PES1UG24CS090

## 1. Objectives
Build a real-world booking platform where pet owners find and book
verified caregivers (grooming, walking, boarding, vet visits), track a
booking through its full lifecycle, and rate caregivers afterward —
going beyond CRUD by enforcing booking-conflict rules transactionally,
denormalizing stats via triggers, and combining a relational core with a
document store for unstructured review content.

## 2. Functional Requirements
- Owners register, add pets, browse/search services, book a caregiver
  for a specific date & time, track booking status, cancel, and review
  completed bookings.
- Caregivers register with a specialization, view their job queue, and
  move a booking through `pending → confirmed → in_progress → completed`.
- Admins view platform-wide stats: revenue, booking-status breakdown,
  caregiver workload, and average ratings.
- The system prevents a caregiver from being double-booked for the same
  date/time, atomically, even under concurrent requests.

## 3. Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React |
| Backend / API | Next.js Route Handlers (`app/api/**/route.js`) |
| SQL Database | MySQL (`mysql2` driver) |
| NoSQL Database | MongoDB (`mongodb` driver) — reviews/ratings |
| Auth | JWT (httpOnly cookie) + bcrypt password hashing |
| Version Control | Git / GitHub |

See `docs/architecture.md` for the system diagram and database-choice
justification, `docs/data-dictionary.md` for the full schema, and
`docs/queries.md` for where each required SQL feature (joins, GROUP BY,
subqueries, transactions, views, stored procedures, triggers, full-text
search, indexing, NoSQL aggregation) is implemented.

ER diagram / relational schema diagram: `docs/er-diagram.png`.

## 4. Project Structure
```
petcare-system/
├── app/
│   ├── api/              # backend route handlers (auth, pets, services,
│   │                        caregivers, bookings, reviews, admin)
│   ├── login/ register/ dashboard/ pets/ book/ bookings/ caregivers/ admin/
│   ├── layout.js  page.js  globals.css
├── components/NavBar.js
├── lib/
│   ├── mysql.js          # MySQL pool + query helper
│   ├── mongo.js          # MongoDB connection helper
│   └── auth.js           # JWT + bcrypt + role guard
├── sql/schema.sql        # full DDL: tables, constraints, indexes,
│                            views, stored procedure, trigger, function
├── scripts/
│   ├── init-db.js        # runs sql/schema.sql
│   └── seed.js           # sample data (MySQL + MongoDB)
├── docs/                 # data dictionary, queries, architecture, ER diagram
├── .env.example
└── package.json
```

## 5. Setup & Run Instructions

### Prerequisites
- Node.js 18+
- MySQL 8+ running locally (or a cloud instance)
- MongoDB running locally (or a free Atlas cluster)
- The `mysql` CLI client available on PATH (used by `npm run db:init`)

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local with your real MySQL/MongoDB credentials and a
# random JWT_SECRET — never commit this file

# 3. Create the database schema (tables, view, procedure, trigger)
npm run db:init

# 4. (Optional) load sample data
npm run db:seed

# 5. Run the app
npm run dev
# open http://localhost:3000
```

### Seeded test logins (after `npm run db:seed`)
All seeded accounts use password `password123`.
| Role | Email |
|---|---|
| Admin | admin@petcare.test |
| Owner | kshitij@petcare.test |
| Caregiver | priya.cg@petcare.test |

## 6. Database Choice & Justification
**MySQL** is mandatory and is the system of record for everything with a
fixed shape and hard relational constraints — users, pets, services,
bookings, payments — where a conflicting double-booking must be
rejected atomically. **MongoDB** stores caregiver reviews: free-text
comments plus a variable-length array of photo URLs, read mostly as an
aggregate (average rating) rather than joined row-by-row — a natural fit
for a flexible document rather than a rigid table. Full reasoning in
`docs/architecture.md` and `lib/mongo.js`.

## 7. Testing
Manual test cases (also see `docs/testing.md`):
1. Register as owner → add a pet → book a service → verify it appears
   under "My Bookings" with status `pending`.
2. Try booking the same caregiver for the same date/time twice →
   second request must fail with **409** (stored-procedure `SIGNAL`).
3. Login as the caregiver → advance the booking through
   `confirmed → in_progress → completed` → confirm `caregiver_stats.
   completed_bookings` increments (trigger) via the Admin panel workload
   table.
4. As the owner, leave a review on the completed booking → confirm the
   caregiver's average rating updates on `/caregivers` (Mongo
   aggregation).
5. Search services by keyword (e.g. "overnight") on the Book page →
   confirm only matching services appear (full-text search).
6. Try accessing `/api/admin/stats` while logged in as an owner →
   expect **403** (role-based authorization).

## 8. Pushing This Project to GitHub

```bash
# from inside the petcare-system/ folder
git init
git add .
git commit -m "Initial commit: pet-care booking system (DBMS L3 project)"

# create an empty repo on GitHub first (via github.com → New repository),
# do NOT initialize it with a README, then:
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### Committing as two separate team members (so both contributions show)
Each of you should push commits using your own GitHub account/email so
individual contribution is visible, as the rubric requires:

```bash
# Kshitij, before committing his part:
git config user.name "Kshitij Prabhu"
git config user.email "your-github-email@example.com"

# Ashwin, before committing his part (on his own machine/clone):
git config user.name "Ashwin Venkatesh"
git config user.email "his-github-email@example.com"
```
Simplest workflow for two people: both clone the repo, each works on a
separate branch or separate files/features, commits under their own
`user.name`/`user.email`, and opens a Pull Request into `main` — GitHub's
contributor graph and commit history will then clearly show both
members' work, satisfying requirement #14.

```bash
# each teammate, after cloning:
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
git checkout -b feature/your-part
# ... make changes ...
git add .
git commit -m "Describe what you built"
git push -u origin feature/your-part
# then open a Pull Request on GitHub into main
```

## 9. Conclusion
This project demonstrates a relational core (MySQL) handling
transactional booking logic, constraints, and reporting views, paired
with a document store (MongoDB) for unstructured review data, exposed
through a Next.js web application with JWT-based role authorization —
going beyond CRUD via a conflict-safe stored procedure, a stats-syncing
trigger, full-text search, and cross-database aggregation.
