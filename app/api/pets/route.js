import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/pets — list the logged-in owner's pets (admin sees all)
export async function GET(request) {
  const auth = requireRole(request, ['owner', 'admin', 'caregiver']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let rows;
  if (auth.user.role === 'owner') {
    rows = await query(
      'SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC',
      [auth.user.user_id]
    );
  } else {
    rows = await query(
      `SELECT p.*, u.name AS owner_name FROM pets p
       JOIN users u ON p.owner_id = u.user_id
       ORDER BY p.created_at DESC`
    );
  }
  return NextResponse.json({ pets: rows });
}

// POST /api/pets — owner adds a new pet
export async function POST(request) {
  const auth = requireRole(request, ['owner']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { name, species, breed, age, gender } = await request.json();
  if (!name || !species) {
    return NextResponse.json({ error: 'name and species are required' }, { status: 400 });
  }

  const result = await query(
    'INSERT INTO pets (name, species, breed, age, gender, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
    [name, species, breed || null, age ?? null, gender || 'unknown', auth.user.user_id]
  );

  return NextResponse.json({ pet_id: result.insertId }, { status: 201 });
}
