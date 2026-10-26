'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (user) {
      fetch('/api/bookings')
        .then((r) => r.json())
        .then((d) => setBookings(d.bookings || []));
    }
  }, [user]);

  if (user === undefined) return <p className="muted">Loading...</p>;
  if (user === null) {
    return (
      <div className="card">
        <p>Please <Link href="/login">login</Link> to view your dashboard.</p>
      </div>
    );
  }

  const upcoming = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status));

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p className="muted">Role: {user.role}</p>

      <div className="grid grid-2">
        <div className="card">
          <h3>Upcoming ({upcoming.length})</h3>
          {upcoming.length === 0 && <p className="muted">Nothing upcoming.</p>}
          {upcoming.slice(0, 5).map((b) => (
            <div key={b.booking_id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
              <strong>{b.pet_name}</strong> — {b.service_name} <br />
              <span className="muted">{b.booking_date} at {b.booking_time}</span>{' '}
              <span className={`badge ${b.status}`}>{b.status}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Quick Links</h3>
          {user.role === 'owner' && (
            <>
              <p><Link href="/pets">Manage my pets</Link></p>
              <p><Link href="/book">Book a new service</Link></p>
              <p><Link href="/bookings">View all bookings</Link></p>
              <p><Link href="/caregivers">Browse caregivers</Link></p>
            </>
          )}
          {user.role === 'caregiver' && (
            <p><Link href="/bookings">View my jobs</Link></p>
          )}
          {user.role === 'admin' && (
            <p><Link href="/admin">Open admin panel</Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
