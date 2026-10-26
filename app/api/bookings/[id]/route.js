import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const OWNER_ALLOWED_TRANSITIONS = ['cancelled'];
const CAREGIVER_ALLOWED_TRANSITIONS = ['confirmed', 'in_progress', 'completed', 'cancelled'];

// PATCH /api/bookings/:id — update booking status.
// Owners may only cancel; caregivers may move the booking through its
// lifecycle. The trigger trg_booking_status_update keeps caregiver_stats in
// sync automatically whenever this UPDATE lands.
export async function PATCH(request, { params }) {
  const auth = requireRole(request, ['owner', 'caregiver', 'admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const bookingId = params.id;
  const { status } = await request.json();
  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  const rows = await query(
    `SELECT b.booking_id, b.caregiver_id, ou.email AS owner_email
     FROM bookings b
     JOIN pets p ON b.pet_id = p.pet_id
     JOIN pet_owners po ON p.owner_id = po.owner_id
     JOIN users ou ON po.owner_id = ou.user_id
     WHERE b.booking_id = ?`,
    [bookingId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  const booking = rows[0];

  if (auth.user.role === 'owner') {
    if (booking.owner_email !== auth.user.email) {
      return NextResponse.json({ error: 'Not your booking' }, { status: 403 });
    }
    if (!OWNER_ALLOWED_TRANSITIONS.includes(status)) {
      return NextResponse.json({ error: 'Owners may only cancel a booking' }, { status: 403 });
    }
  } else if (auth.user.role === 'caregiver') {
    if (booking.caregiver_id !== auth.user.user_id) {
      return NextResponse.json({ error: 'Not your job' }, { status: 403 });
    }
    if (!CAREGIVER_ALLOWED_TRANSITIONS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
  }
  // admin may set any status

  await query('UPDATE bookings SET status = ? WHERE booking_id = ?', [status, bookingId]);

  if (status === 'cancelled') {
    await query('UPDATE payments SET payment_status = ? WHERE booking_id = ?', ['refunded', bookingId]);
  } else if (status === 'completed') {
    await query('UPDATE payments SET payment_status = ?, paid_at = NOW() WHERE booking_id = ?', ['paid', bookingId]);
  }

  return NextResponse.json({ ok: true });
}
