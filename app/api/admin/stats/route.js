import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getReviewsCollection } from '@/lib/mongo';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/stats — dashboard numbers for the admin role
export async function GET(request) {
  const auth = requireRole(request, ['admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const [counts] = await query(
    `SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'owner') AS total_owners,
        (SELECT COUNT(*) FROM users WHERE role = 'caregiver') AS total_caregivers,
        (SELECT COUNT(*) FROM pets) AS total_pets,
        (SELECT COUNT(*) FROM bookings) AS total_bookings,
        (SELECT COALESCE(SUM(amount),0) FROM bookings WHERE status = 'completed') AS total_revenue`
  );

  const workload = await query('SELECT * FROM vw_caregiver_workload ORDER BY total_revenue DESC');

  const statusBreakdown = await query(
    'SELECT status, COUNT(*) AS count FROM bookings GROUP BY status'
  );

  let avgPlatformRating = null;
  try {
    const reviews = await getReviewsCollection();
    const agg = await reviews
      .aggregate([{ $group: { _id: null, avg_rating: { $avg: '$rating' }, total_reviews: { $sum: 1 } } }])
      .toArray();
    avgPlatformRating = agg[0] || null;
  } catch {
    avgPlatformRating = null;
  }

  return NextResponse.json({
    counts,
    workload,
    statusBreakdown,
    avgPlatformRating,
  });
}
