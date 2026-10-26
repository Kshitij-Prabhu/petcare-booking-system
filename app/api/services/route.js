import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/services?q=keyword — list services, optionally full-text searched
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  let rows;
  if (q && q.trim()) {
    // Demonstrates the FULLTEXT index + MATCH...AGAINST advanced feature.
    rows = await query(
      `SELECT *, MATCH(service_name, description) AGAINST(? IN NATURAL LANGUAGE MODE) AS relevance
       FROM services
       WHERE MATCH(service_name, description) AGAINST(? IN NATURAL LANGUAGE MODE)
       ORDER BY relevance DESC`,
      [q, q]
    );
  } else {
    rows = await query('SELECT * FROM services ORDER BY service_name');
  }
  return NextResponse.json({ services: rows });
}

// POST /api/services — admin only: add a new service to the catalog
export async function POST(request) {
  const auth = requireRole(request, ['admin']);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { service_name, description, base_price, duration_minutes } = await request.json();
  if (!service_name || base_price == null || !duration_minutes) {
    return NextResponse.json({ error: 'service_name, base_price and duration_minutes are required' }, { status: 400 });
  }

  const result = await query(
    'INSERT INTO services (service_name, description, base_price, duration_minutes) VALUES (?, ?, ?, ?)',
    [service_name, description || null, base_price, duration_minutes]
  );
  return NextResponse.json({ service_id: result.insertId }, { status: 201 });
}
