import { NextResponse } from 'next/server';
import { query, getPool } from '@/lib/mysql';
import { hashPassword, signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/register
// body: { name, email, password, role, phone, address?, specialization?, experience_years? }
export async function POST(request) {
  const body = await request.json();
  const { name, email, password, role, phone } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'name, email, password and role are required' }, { status: 400 });
  }
  if (!['owner', 'caregiver'].includes(role)) {
    // Admin accounts are seeded directly, not self-registered.
    return NextResponse.json({ error: 'role must be owner or caregiver' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const existing = await query('SELECT user_id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.execute(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, phone || null]
    );
    const userId = userResult.insertId;

    if (role === 'owner') {
      await conn.execute(
        'INSERT INTO pet_owners (owner_id, address) VALUES (?, ?)',
        [userId, body.address || null]
      );
    } else if (role === 'caregiver') {
      await conn.execute(
        'INSERT INTO caregivers (caregiver_id, specialization, experience_years, bio) VALUES (?, ?, ?, ?)',
        [userId, body.specialization || null, body.experience_years || 0, body.bio || null]
      );
    }

    await conn.commit();

    const token = signToken({ user_id: userId, name, email, role });
    const res = NextResponse.json({ user: { user_id: userId, name, email, role } }, { status: 201 });
    res.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    await conn.rollback();
    return NextResponse.json({ error: 'Registration failed', detail: err.message }, { status: 500 });
  } finally {
    conn.release();
  }
}
