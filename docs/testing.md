# Testing Results

## Solo verification on merged main (12 November 2026)

Tested merge commit `1c94f1e` on one Mac with separate Chrome sessions
for the owner, another owner, a caregiver, and the admin. The run used
a new MySQL 8.0.46 container and an unused local MongoDB database.
Both test databases were freshly seeded.

| # | Check | Observed result |
|---|---|---|
| 1 | Owner registration | HTTP 201. The browser received an HttpOnly JWT cookie and `/api/auth/me` returned the new owner. MySQL had matching `users` and `pet_owners` rows. |
| 2 | Caregiver registration | HTTP 201. MySQL had matching `users` and `caregivers` rows. The trigger created a `caregiver_stats` row with zero completed and zero cancelled bookings. |
| 3 | Duplicate email | HTTP 409 with “Email already registered.” MySQL still had one user row for that email. |
| 4 | Add pet | HTTP 201. The pet list returned HTTP 200, and Milo appeared in My Pets. |
| 5 | Create booking | HTTP 201. MySQL had one pending booking and one matching pending payment. My Bookings displayed the pending booking. |
| 6 | Double booking | HTTP 409 with “Caregiver already has a booking at this date/time.” The slot still had one booking and one payment. |
| 7 | Unauthorized booking edit | A different owner’s cancellation returned HTTP 403 with “Not your booking.” The booking and payment stayed pending. |
| 8 | Caregiver status flow | HTTP 200 for each update to confirmed, in progress, and completed. The payment became paid with a `paid_at` timestamp, and Priya’s completion counter rose from 1 to 2. My Bookings displayed completed, paid, and Leave Review before the review was submitted. |
| 9 | Cancel and rebook | Cancellation returned HTTP 200. The original booking became cancelled, its payment became refunded, and Priya’s cancellation counter rose from 0 to 1. Rebooking the same slot returned HTTP 201 and created a separate pending booking and payment. |
| 10 | Review flow | Submitting a 3-star review from My Bookings returned HTTP 201 and stored the review in MongoDB. Priya’s review count rose from 1 to 2 and her average went from 5 to 4. Caregivers displayed four filled stars and “4 (2 reviews).” |
| 11 | Duplicate review | HTTP 409 with “You already reviewed this booking.” MongoDB still had one review for the booking. |
| 12 | Review a pending booking | HTTP 400 with “You can only review a completed booking.” MongoDB had zero reviews for the pending booking. |
| 13 | Full-text search | Searching for `overnight` returned HTTP 200 and only Overnight Boarding. The booking form’s service selector showed the same match. |
| 14 | Owner access to admin stats | HTTP 403 with “Not authorized for this action.” |
| 15 | Admin stats | HTTP 200. The response reported 3 owners, 3 caregivers, 3 pets, and 5 bookings (2 completed, 2 pending, 1 cancelled). Completed revenue was ₹1,598.00. The admin UI showed a 4.00 average from 2 reviews and a workload of 4 bookings with 2 completed for Priya. |
| 16 | Environment-based configuration | Reviewed the database and auth helpers. MySQL and MongoDB connection settings and the JWT secret come from environment variables. `.env.local` is ignored and untracked. |

[The seed script](../scripts/seed.js) inserts one 5-star review for
Priya. Before submitting the new review, both MongoDB and the running
Caregivers API confirmed one review with an average of 5. The fresh-seed
result was **1 → 2** after the 3-star review.

- [Caregivers showing Priya’s star rating after the review](screenshots/caregivers-star-rating.png)
- [My Bookings showing Leave Review before submission](screenshots/bookings-leave-review.png)

### Follow-up observations

- My Bookings still offered Leave Review immediately after successful
  submission. The API rejected a duplicate with HTTP 409 and retained
  one review for that booking.
- The admin workload table showed ₹2,196.00 as Priya’s Revenue. That
  figure included the pending and cancelled booking amounts, while the
  platform’s Revenue (completed) figure used only completed bookings.

### Pending for 13 November 2026

Two-laptop verification against the shared databases is pending because
the teammate’s laptop was unavailable for this run. If the shared MySQL
database still uses the original schema, follow the
[README upgrade steps](../README.md#upgrade-an-existing-mysql-database)
before the shared test.

## Historical evidence from PR #1 (11 November 2026)

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
| Caregiver completion and owner review | The caregiver advanced the booking to confirmed, in progress, and completed. The completion counter incremented and payment became paid. The owner review returned 201 and the MongoDB aggregation raised Priya’s review count from 1 to 2 on the original baseline and fresh-install runs. The migration test database already had two reviews before its new review, so that run showed 2 → 3. |
| Production build and browser | `npm run build` passed. Chrome verified the conflict message in the booking form, cancellation, and the replacement in My Bookings against the migrated database. |

- [Active-slot conflict in the booking form](screenshots/booking-slot-conflict.png)
- [Original cancelled booking and its replacement](screenshots/cancelled-slot-rebooked.png)
