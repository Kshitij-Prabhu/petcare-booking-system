import { NextResponse } from 'next/server';
import { getReviewsCollection } from '@/lib/mongo';
import { query } from '@/lib/mysql';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/reviews?caregiver_id=5 — reviews for one caregiver
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const caregiverId = searchParams.get('caregiver_id');
  if (!caregiverId) {
    return NextResponse.json({ error: 'caregiver_id query param is required' }, { status: 400 });
  }

  const reviews = await getReviewsCollection();
  const docs = await reviews
    .find({ caregiver_id: Number(caregiverId) })
    .sort({ created_at: -1 })
    .toArray();

  return NextResponse.json({ reviews: docs });
}

// POST /api/reviews — owner leaves a review for a completed booking
// body: { booking_id, rating, comment, photos: [url, ...] }
export async function POST(request) {
  const auth = requireRole(request, ['owner']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { booking_id, rating, comment, photos } = await request.json();
  if (!booking_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'booking_id and rating (1-5) are required' }, { status: 400 });
  }

  // Confirm this booking belongs to the owner and is completed (relational
  // source of truth lives in MySQL; the review document references it by id).
  const rows = await query(
    `SELECT b.booking_id, b.caregiver_id, b.pet_id, b.status, ou.user_id AS owner_id
     FROM bookings b
     JOIN pets p ON b.pet_id = p.pet_id
     JOIN pet_owners po ON p.owner_id = po.owner_id
     JOIN users ou ON po.owner_id = ou.user_id
     WHERE b.booking_id = ? AND ou.user_id = ?`,
    [booking_id, auth.user.user_id]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  const booking = rows[0];
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'You can only review a completed booking' }, { status: 400 });
  }

  const reviews = await getReviewsCollection();
  const existing = await reviews.findOne({ booking_id: Number(booking_id) });
  if (existing) {
    return NextResponse.json({ error: 'You already reviewed this booking' }, { status: 409 });
  }

  const doc = {
    booking_id: Number(booking_id),
    owner_id: booking.owner_id,
    caregiver_id: booking.caregiver_id,
    pet_id: booking.pet_id,
    rating: Number(rating),
    comment: comment || '',
    photos: Array.isArray(photos) ? photos : [],
    created_at: new Date(),
  };
  const result = await reviews.insertOne(doc);

  return NextResponse.json({ review_id: result.insertedId }, { status: 201 });
}
