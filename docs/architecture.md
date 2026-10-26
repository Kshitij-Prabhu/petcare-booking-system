# System Architecture

```
┌─────────────────────┐
│   Next.js Frontend   │  (App Router pages: login, dashboard, pets,
│  (React, app/*.js)   │   book, bookings, caregivers, admin)
└──────────┬───────────┘
           │ fetch() calls, httpOnly JWT cookie
┌──────────▼───────────┐
│  Next.js API Routes   │  (app/api/**/route.js — the backend/API layer)
│  - auth (JWT+bcrypt)  │
│  - role-based guards  │
└──────┬────────┬───────┘
       │         │
┌──────▼─────┐ ┌─▼────────────────┐
│   MySQL     │ │   MongoDB         │
│ petcare_db  │ │ petcare_reviews   │
│ (relational │ │ (unstructured     │
│  core data) │ │  review content)  │
└─────────────┘ └───────────────────┘
```

## Why two databases
- **MySQL** holds everything with a fixed shape and strict relationships
  that must stay consistent: users, pets, services, bookings, payments.
  Booking creation needs an atomic, constraint-checked transaction
  (`sp_create_booking`) — exactly what a relational engine is for.
- **MongoDB** holds reviews: free-text comments of varying length, a
  variable number of photo URLs, and data that's read mostly as an
  aggregate (average rating) rather than joined row-by-row. See
  `docs/data-dictionary.md` for the full justification.

## Roles & Authorization
Three roles: `owner`, `caregiver`, `admin`. The JWT issued at
login/register carries `{ user_id, name, email, role }`; `lib/auth.js`'s
`requireRole()` is called at the top of every protected API route to
enforce who can do what (e.g. only `owner` can create a booking, only the
assigned `caregiver` can advance its status).

## Data validation & integrity
- Database level: `CHECK` constraints (age range, non-negative price,
  rating bounds via MongoDB app-layer validation), `ENUM` columns,
  `UNIQUE(caregiver_id, booking_date, booking_time)` to block double
  bookings, foreign keys with explicit `ON DELETE` behavior.
- Application level: required-field checks in every API route before any
  query runs, ownership checks (an owner can only edit *their* pets/
  bookings), and the `sp_create_booking` transaction re-checks the
  conflict under `FOR UPDATE` locking to close the race condition a
  pure application-level check could miss.

## Environment configuration
All credentials (MySQL + MongoDB connection strings, JWT secret) are
read from environment variables via `.env.local` (see `.env.example`),
never hard-coded — see `lib/mysql.js`, `lib/mongo.js`, `lib/auth.js`.
