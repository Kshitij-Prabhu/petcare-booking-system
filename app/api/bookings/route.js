import { NextResponse } from 'next/server';
import { bookingSlotConflictMessage, callProcedureWithOut, isBookingSlotConflict, query } from '@/lib/mysql';
import { getReviewsCollection } from '@/lib/mongo';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/bookings — role-aware listing using the vw_booking_details view
export async function GET(request) {
  const auth = requireRole(request, ['owner', 'caregiver', 'admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let rows;
  if (auth.user.role === 'owner') {
    rows = await query(
      'SELECT * FROM vw_booking_details WHERE owner_email = ? ORDER BY booking_date DESC, booking_time DESC',
      [auth.user.email]
    );
    const completed = rows.filter((booking) => booking.status === 'completed');
    if (completed.length > 0) {
      try {
        const reviews = await getReviewsCollection();
        const reviewedIds = new Set(await reviews.distinct('booking_id', {
          owner_id: auth.user.user_id,
          booking_id: { $in: completed.map((booking) => booking.booking_id) },
        }));
        for (const booking of completed) {
          booking.reviewed = reviewedIds.has(booking.booking_id);
        }
      } catch (err) {
        console.error('Could not load booking review status', err.code || err.name);
      }
    }
  } else if (auth.user.role === 'caregiver') {
    rows = await query(
      'SELECT * FROM vw_booking_details WHERE caregiver_id = ? ORDER BY booking_date DESC, booking_time DESC',
      [auth.user.user_id]
    );
    const completed = rows.filter((booking) => booking.status === 'completed');
    if (completed.length > 0) {
      try {
        const reviews = await getReviewsCollection();
        const docs = await reviews.find(
          {
            caregiver_id: auth.user.user_id,
            booking_id: { $in: completed.map((booking) => booking.booking_id) },
          },
          { projection: { _id: 0, booking_id: 1, rating: 1, comment: 1 } }
        ).sort({ created_at: -1, _id: -1 }).toArray();
        const byBookingId = new Map();
        for (const { booking_id, rating, comment } of docs) {
          if (!byBookingId.has(booking_id)) byBookingId.set(booking_id, { rating, comment });
        }
        for (const booking of completed) {
          booking.review = byBookingId.get(booking.booking_id) ?? null;
        }
      } catch (err) {
        console.error('Could not load job reviews', err.code || err.name);
      }
    }
  } else {
    rows = await query('SELECT * FROM vw_booking_details ORDER BY booking_date DESC, booking_time DESC');
  }
  return NextResponse.json({ bookings: rows });
}

// POST /api/bookings — owner creates a booking via sp_create_booking
// (the unique index enforces the slot rule inside the booking/payment transaction).
export async function POST(request) {
  const auth = requireRole(request, ['owner']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { pet_id, service_id, caregiver_id, booking_date, booking_time, payment_method } = await request.json();
  if (!pet_id || !service_id || !caregiver_id || !booking_date || !booking_time) {
    return NextResponse.json({ error: 'pet_id, service_id, caregiver_id, booking_date, booking_time are required' }, { status: 400 });
  }

  // Confirm the pet belongs to this owner
  const owned = await query('SELECT pet_id FROM pets WHERE pet_id = ? AND owner_id = ?', [
    pet_id,
    auth.user.user_id,
  ]);
  if (owned.length === 0) {
    return NextResponse.json({ error: 'Pet does not belong to you' }, { status: 403 });
  }

  const serviceRows = await query('SELECT base_price FROM services WHERE service_id = ?', [service_id]);
  if (serviceRows.length === 0) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }
  const amount = serviceRows[0].base_price;

  try {
    const { booking_id } = await callProcedureWithOut(
      'CALL sp_create_booking(?, ?, ?, ?, ?, ?, ?, @booking_id)',
      [pet_id, service_id, caregiver_id, booking_date, booking_time, amount, payment_method || 'upi'],
      ['booking_id']
    );
    return NextResponse.json({ booking_id }, { status: 201 });
  } catch (err) {
    if (isBookingSlotConflict(err)) {
      return NextResponse.json({ error: bookingSlotConflictMessage }, { status: 409 });
    }
    console.error('Booking creation failed', err.code);
    return NextResponse.json({ error: 'Could not create booking' }, { status: 500 });
  }
}
