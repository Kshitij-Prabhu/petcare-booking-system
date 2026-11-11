# Testing Results

## Cancelled-slot rebooking verification

On 11 November 2026, one Mac ran the Next.js app against MySQL 8.0.46
in a disposable Docker container and separate local MongoDB test
databases. Owner and caregiver calls used separate login cookies.

| Check | Observed result |
|---|---|
| Original schema and API | Initial booking returned 201, and an active duplicate returned 409. After cancellation, the same slot returned 500 from `uq_caregiver_slot`. The cancelled booking stayed in history and the retry added no booking or payment. |
| Forward migration | Compared all original column values before and after. All four bookings and four payments matched, including the cancelled booking and its refunded payment. |
| Active slot and replacement | On the migrated and fresh schemas, an active duplicate returned 409. Cancellation retained the old booking and refunded payment. Rebooking returned 201 and created one new pending booking and matching payment. A second cancellation released the same slot again while preserving both cancelled rows. |
| Reactivating a cancelled booking | On both schemas, trying to confirm the old booking while the replacement held the slot returned 409 and left the rows unchanged. |
| Concurrent requests | On each schema, ten pairs of simultaneous POSTs to free slots returned one 201 and one 409 per pair. A MySQL query confirmed exactly one booking and one matching payment per slot. |
| Other SQL failure | On both schemas, an invalid payment method returned 500. MySQL contained no booking or payment for that attempt. |
| Caregiver completion and owner review | The caregiver advanced the booking to confirmed, in progress, and completed. The completion counter incremented and payment became paid. The owner review returned 201 and the MongoDB aggregation raised the review count from 1 to 2 on the baseline and fresh installs, and from 2 to 3 after migration. |
| Production build and browser | `npm run build` passed. Chrome verified the conflict message in the booking form, cancellation, and the replacement in My Bookings against the migrated database. |

- [Active-slot conflict in the booking form](screenshots/booking-slot-conflict.png)
- [Original cancelled booking and its replacement](screenshots/cancelled-slot-rebooked.png)

Two-laptop verification against the shared databases is pending. Apply
the migration to the shared MySQL database using the README upgrade
steps before running that demo.

## Original manual test suite

These results are from the original app against local MySQL and MongoDB.

| # | Test Case | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Owner registration | Register with role=owner | 201, JWT cookie set, row in `users` + `pet_owners` | Pass |
| 2 | Caregiver registration | Register with role=caregiver | 201, row in `users` + `caregivers` + auto `caregiver_stats` row (trigger) | Pass |
| 3 | Duplicate email | Register twice with same email | 409 Conflict | Pass |
| 4 | Add pet | Owner adds a pet | 201, pet listed under `/pets` | Pass |
| 5 | Create booking | Owner books caregiver for free slot | 201, booking `pending`, payment `pending` | Pass |
| 6 | Double booking | Book same caregiver/date/time twice | Second call returns 409 (stored procedure SIGNAL + ROLLBACK) | Pass |
| 7 | Unauthorized booking edit | Owner B tries to cancel Owner A's booking | 403 | Pass |
| 8 | Caregiver status flow | Caregiver moves booking pending→confirmed→in_progress→completed | Each PATCH succeeds; on `completed`, `caregiver_stats.completed_bookings` increments (trigger) and payment marked `paid` | Pass |
| 9 | Cancel booking | Owner cancels a pending booking | status=`cancelled`, payment=`refunded`, `caregiver_stats.cancelled_bookings` increments | Pass |
| 10 | Review flow | Owner reviews a completed booking | 201 in MongoDB `reviews`; `/caregivers` shows updated avg rating (aggregation) | Pass |
| 11 | Duplicate review | Review the same booking twice | 409 | Pass |
| 12 | Review a non-completed booking | Try reviewing a `pending` booking | 400 | Pass |
| 13 | Full-text search | `GET /api/services?q=overnight` | Returns only "Overnight Boarding" | Pass |
| 14 | Role-gated admin stats | Owner calls `/api/admin/stats` | 403 | Pass |
| 15 | Admin stats | Admin calls `/api/admin/stats` | 200, totals + workload view + Mongo rating aggregate | Pass |
| 16 | Env-based config | Inspect `lib/mysql.js`, `lib/mongo.js` | No hard-coded credentials; all from `process.env` | Pass |

Run these yourself after `npm run db:seed` using the seeded accounts in
the README, or with a REST client (curl/Postman) against the routes
under `app/api/`.
