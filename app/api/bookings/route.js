import { NextResponse } from 'next/server';
import { getPool, query } from '@/lib/mysql';
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
  } else if (auth.user.role === 'caregiver') {
    rows = await query(
      'SELECT * FROM vw_booking_details WHERE caregiver_id = ? ORDER BY booking_date DESC, booking_time DESC',
      [auth.user.user_id]
    );
  } else {
    rows = await query('SELECT * FROM vw_booking_details ORDER BY booking_date DESC, booking_time DESC');
  }
  return NextResponse.json({ bookings: rows });
}

// POST /api/bookings — owner creates a booking via sp_create_booking
// (stored procedure enforces the no-double-booking rule atomically).
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

  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'CALL sp_create_booking(?, ?, ?, ?, ?, ?, ?, @booking_id)',
      [pet_id, service_id, caregiver_id, booking_date, booking_time, amount, payment_method || 'upi']
    );
    const [[{ booking_id }]] = await conn.query('SELECT @booking_id AS booking_id');
    return NextResponse.json({ booking_id }, { status: 201 });
  } catch (err) {
    // SIGNAL from the stored procedure (double-booking) surfaces here as a 45000 error
    const message = err.sqlMessage || err.message || 'Could not create booking';
    const status = message.includes('already has a booking') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  } finally {
    conn.release();
  }
}
