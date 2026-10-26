'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NavBar() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="navbar">
      <Link href="/" className="brand">🐾 PetCare Booking</Link>
      <div>
        {!user && (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
        {user && user.role === 'owner' && (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/pets">My Pets</Link>
            <Link href="/book">Book a Service</Link>
            <Link href="/bookings">My Bookings</Link>
          </>
        )}
        {user && user.role === 'caregiver' && (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/bookings">My Jobs</Link>
          </>
        )}
        {user && user.role === 'admin' && (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/admin">Admin Panel</Link>
          </>
        )}
        {user && (
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
            Logout ({user.name})
          </a>
        )}
      </div>
    </nav>
  );
}
