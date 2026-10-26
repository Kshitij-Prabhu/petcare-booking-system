import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/pets/:id — owner updates their own pet
export async function PATCH(request, { params }) {
  const auth = requireRole(request, ['owner']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const petId = params.id;
  const owned = await query('SELECT pet_id FROM pets WHERE pet_id = ? AND owner_id = ?', [
    petId,
    auth.user.user_id,
  ]);
  if (owned.length === 0) {
    return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
  }

  const { name, species, breed, age, gender } = await request.json();
  await query(
    'UPDATE pets SET name = ?, species = ?, breed = ?, age = ?, gender = ? WHERE pet_id = ?',
    [name, species, breed || null, age ?? null, gender || 'unknown', petId]
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/pets/:id
export async function DELETE(request, { params }) {
  const auth = requireRole(request, ['owner']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const petId = params.id;
  const owned = await query('SELECT pet_id FROM pets WHERE pet_id = ? AND owner_id = ?', [
    petId,
    auth.user.user_id,
  ]);
  if (owned.length === 0) {
    return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
  }

  await query('DELETE FROM pets WHERE pet_id = ?', [petId]);
  return NextResponse.json({ ok: true });
}
