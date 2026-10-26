'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'owner', phone: '',
    address: '', specialization: '', experience_years: '', bio: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Registration failed');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
      <h2>Create an Account</h2>
      <form onSubmit={handleSubmit}>
        <label>I am a</label>
        <select value={form.role} onChange={(e) => update('role', e.target.value)}>
          <option value="owner">Pet Owner</option>
          <option value="caregiver">Caregiver</option>
        </select>

        <label>Full Name</label>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} required />

        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />

        <label>Password</label>
        <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} />

        <label>Phone</label>
        <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />

        {form.role === 'owner' && (
          <>
            <label>Address</label>
            <input value={form.address} onChange={(e) => update('address', e.target.value)} />
          </>
        )}

        {form.role === 'caregiver' && (
          <>
            <label>Specialization</label>
            <input
              placeholder="e.g. Dog grooming, Cat sitting"
              value={form.specialization}
              onChange={(e) => update('specialization', e.target.value)}
            />
            <label>Years of Experience</label>
            <input
              type="number"
              min="0"
              value={form.experience_years}
              onChange={(e) => update('experience_years', e.target.value)}
            />
            <label>Short Bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => update('bio', e.target.value)} />
          </>
        )}

        {error && <p className="error-text">{error}</p>}
        <button type="submit">Create Account</button>
      </form>
    </div>
  );
}
