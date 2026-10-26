# Data Dictionary — Pet-Care Service Booking & Tracking System

## SQL Database: `petcare_db` (MySQL)

### users
| Column | Type | Constraints |
|---|---|---|
| user_id | INT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL (bcrypt hash, never plaintext) |
| role | ENUM('owner','caregiver','admin') | NOT NULL, DEFAULT 'owner' |
| phone | VARCHAR(20) | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### pet_owners
| Column | Type | Constraints |
|---|---|---|
| owner_id | INT | PK, FK → users.user_id (ON DELETE CASCADE) |
| address | VARCHAR(255) | |

### caregivers
| Column | Type | Constraints |
|---|---|---|
| caregiver_id | INT | PK, FK → users.user_id (ON DELETE CASCADE) |
| specialization | VARCHAR(100) | |
| experience_years | INT | DEFAULT 0, CHECK >= 0 |
| bio | TEXT | |
| is_available | BOOLEAN | DEFAULT TRUE |

### pets
| Column | Type | Constraints |
|---|---|---|
| pet_id | INT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL |
| species | VARCHAR(50) | NOT NULL |
| breed | VARCHAR(100) | |
| age | INT | CHECK 0–50 |
| gender | ENUM('male','female','unknown') | DEFAULT 'unknown' |
| owner_id | INT | FK → pet_owners.owner_id (ON DELETE CASCADE) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### services
| Column | Type | Constraints |
|---|---|---|
| service_id | INT | PK, AUTO_INCREMENT |
| service_name | VARCHAR(100) | NOT NULL |
| description | TEXT | FULLTEXT indexed with service_name |
| base_price | DECIMAL(10,2) | CHECK >= 0 |
| duration_minutes | INT | CHECK > 0 |

### bookings
| Column | Type | Constraints |
|---|---|---|
| booking_id | INT | PK, AUTO_INCREMENT |
| booking_date | DATE | NOT NULL |
| booking_time | TIME | NOT NULL |
| status | ENUM('pending','confirmed','in_progress','completed','cancelled') | DEFAULT 'pending' |
| amount | DECIMAL(10,2) | CHECK >= 0 |
| pet_id | INT | FK → pets.pet_id (ON DELETE CASCADE) |
| service_id | INT | FK → services.service_id (ON DELETE RESTRICT) |
| caregiver_id | INT | FK → caregivers.caregiver_id (ON DELETE RESTRICT) |
| created_at / updated_at | TIMESTAMP | auto-managed |
| — | UNIQUE(caregiver_id, booking_date, booking_time) | prevents double-booking |

### payments
| Column | Type | Constraints |
|---|---|---|
| payment_id | INT | PK, AUTO_INCREMENT |
| booking_id | INT | FK → bookings.booking_id (ON DELETE CASCADE), UNIQUE |
| amount | DECIMAL(10,2) | CHECK >= 0 |
| payment_method | ENUM('cash','card','upi','wallet') | DEFAULT 'upi' |
| payment_status | ENUM('pending','paid','refunded') | DEFAULT 'pending' |
| paid_at | TIMESTAMP | NULL |

### caregiver_stats
| Column | Type | Constraints |
|---|---|---|
| caregiver_id | INT | PK, FK → caregivers.caregiver_id (ON DELETE CASCADE) |
| completed_bookings | INT | DEFAULT 0, maintained by `trg_booking_status_update` |
| cancelled_bookings | INT | DEFAULT 0, maintained by `trg_booking_status_update` |

### Relationships
- `pet_owners` 1—N `pets`
- `pets` 1—N `bookings`
- `services` 1—N `bookings`
- `caregivers` 1—N `bookings`
- `bookings` 1—1 `payments`
- `caregivers` 1—1 `caregiver_stats`

---

## NoSQL Database: `petcare_reviews` (MongoDB)

### Collection: `reviews`
One document per owner review of a completed booking.

```json
{
  "_id": ObjectId,
  "booking_id": 12,          // references bookings.booking_id in MySQL
  "owner_id": 3,             // references users.user_id
  "caregiver_id": 5,         // references users.user_id (caregiver)
  "pet_id": 7,               // references pets.pet_id
  "rating": 5,                // 1-5
  "comment": "string",
  "photos": ["url1", "url2"], // variable-length array, why Mongo fits here
  "created_at": ISODate
}
```

**Why MongoDB instead of a SQL table for reviews:** review content is
unstructured/variable (free text, 0–N photo URLs, optional future fields
like tags) and is read mostly as an aggregate (average rating per
caregiver) rather than joined row-by-row against relational data. A
document per review avoids a rigid schema or an extra photos-join-table
for something that is naturally one flexible record. See `lib/mongo.js`
for the full justification in context.

**Indexes:**
- `{ caregiver_id: 1 }` — speeds up per-caregiver review listing and the
  `$group` aggregation used to compute average rating.
- `{ booking_id: 1 }` (unique) — enforces one review per booking at the
  application layer (checked before insert; can be added as a MongoDB
  unique index with `db.reviews.createIndex({booking_id:1},{unique:true})`).

**Retrieval strategy:** `GET /api/reviews?caregiver_id=X` does a simple
`find` + sort; `GET /api/caregivers` and `GET /api/admin/stats` run an
aggregation pipeline (`$group` with `$avg` / `$sum`) to compute rollups
without a separate ETL step.
