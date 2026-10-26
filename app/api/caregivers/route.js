import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getReviewsCollection } from '@/lib/mongo';

// This route hits MySQL + MongoDB on every call and must never be
// statically generated at build time.
export const dynamic = 'force-dynamic';

// GET /api/caregivers — list caregivers (SQL) enriched with their average
// rating computed via a MongoDB aggregation pipeline over the reviews
// collection. This is the cross-database integration point: relational
// identity + workload live in MySQL, free-text review content lives in
// Mongo, and this route stitches the two together for the UI.
export async function GET() {
  const caregivers = await query(
    `SELECT c.caregiver_id, u.name, u.email, c.specialization, c.experience_years,
            c.bio, c.is_available, cs.completed_bookings, cs.cancelled_bookings
     FROM caregivers c
     JOIN users u ON c.caregiver_id = u.user_id
     LEFT JOIN caregiver_stats cs ON c.caregiver_id = cs.caregiver_id
     ORDER BY c.experience_years DESC`
  );

  let ratings = [];
  try {
    const reviews = await getReviewsCollection();
    // NoSQL aggregation: average rating + review count per caregiver
    ratings = await reviews
      .aggregate([
        {
          $group: {
            _id: '$caregiver_id',
            avg_rating: { $avg: '$rating' },
            review_count: { $sum: 1 },
          },
        },
      ])
      .toArray();
  } catch (err) {
    // Mongo may be unreachable in dev before setup; degrade gracefully.
    ratings = [];
  }

  const ratingMap = new Map(ratings.map((r) => [String(r._id), r]));

  const enriched = caregivers.map((c) => {
    const r = ratingMap.get(String(c.caregiver_id));
    return {
      ...c,
      avg_rating: r ? Number(r.avg_rating.toFixed(2)) : null,
      review_count: r ? r.review_count : 0,
    };
  });

  return NextResponse.json({ caregivers: enriched });
}
