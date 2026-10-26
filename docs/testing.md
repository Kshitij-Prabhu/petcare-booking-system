# Testing Results

Manual test cases executed against a local MySQL + MongoDB instance.

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
