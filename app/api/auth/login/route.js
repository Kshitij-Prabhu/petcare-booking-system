import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { verifyPassword, signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/login  body: { email, password }
export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }

  const rows = await query(
    'SELECT user_id, name, email, password_hash, role FROM users WHERE email = ?',
    [email]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const user = rows[0];
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signToken({ user_id: user.user_id, name: user.name, email: user.email, role: user.role });
  const res = NextResponse.json({
    user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
  });
  res.cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
