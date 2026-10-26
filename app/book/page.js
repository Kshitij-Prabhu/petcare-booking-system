'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookPage() {
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [form, setForm] = useState({
    pet_id: '', service_id: '', caregiver_id: '', booking_date: '', booking_time: '', payment_method: 'upi',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function loadServices(q) {
    const url = q ? `/api/services?q=${encodeURIComponent(q)}` : '/api/services';
    const res = await fetch(url);
    const data = await res.json();
    setServices(data.services || []);
  }

  useEffect(() => {
    fetch('/api/pets').then((r) => r.json()).then((d) => setPets(d.pets || []));
    loadServices();
    fetch('/api/caregivers').then((r) => r.json()).then((d) => setCaregivers(d.caregivers || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not create booking');
      return;
    }
    setSuccess('Booking created!');
    setTimeout(() => router.push('/bookings'), 800);
  }

  return (
    <div>
      <h2>Book a Service</h2>

      <div className="card">
        <label>Search services</label>
        <input
          placeholder="e.g. grooming, boarding, walk..."
          value={searchQ}
          onChange={(e) => { setSearchQ(e.target.value); loadServices(e.target.value); }}
        />
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <label>Pet</label>
        <select value={form.pet_id} onChange={(e) => setForm({ ...form, pet_id: e.target.value })} required>
          <option value="">Select a pet</option>
          {pets.map((p) => <option key={p.pet_id} value={p.pet_id}>{p.name} ({p.species})</option>)}
        </select>

        <label>Service</label>
        <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} required>
          <option value="">Select a service</option>
          {services.map((s) => (
            <option key={s.service_id} value={s.service_id}>
              {s.service_name} — ₹{s.base_price} ({s.duration_minutes} min)
            </option>
          ))}
        </select>

        <label>Caregiver</label>
        <select value={form.caregiver_id} onChange={(e) => setForm({ ...form, caregiver_id: e.target.value })} required>
          <option value="">Select a caregiver</option>
          {caregivers.map((c) => (
            <option key={c.caregiver_id} value={c.caregiver_id}>
              {c.name} {c.specialization ? `— ${c.specialization}` : ''} {c.avg_rating ? `(★${c.avg_rating})` : ''}
            </option>
          ))}
        </select>

        <label>Date</label>
        <input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} required />

        <label>Time</label>
        <input type="time" value={form.booking_time} onChange={(e) => setForm({ ...form, booking_time: e.target.value })} required />

        <label>Payment Method</label>
        <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
        </select>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
        <button type="submit">Confirm Booking</button>
      </form>
    </div>
  );
}
