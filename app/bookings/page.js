'use client';

import { useEffect, useState } from 'react';

const CAREGIVER_NEXT = {
  pending: 'confirmed',
  confirmed: 'in_progress',
  in_progress: 'completed',
};

export default function BookingsPage() {
  const [user, setUser] = useState(undefined);
  const [bookings, setBookings] = useState([]);
  const [reviewFor, setReviewFor] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  async function loadBookings() {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    setBookings(data.bookings || []);
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
    loadBookings();
  }, []);

  async function updateStatus(bookingId, status) {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadBookings();
    else {
      const d = await res.json();
      alert(d.error || 'Failed to update');
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: reviewFor, rating: Number(reviewForm.rating), comment: reviewForm.comment }),
    });
    if (res.ok) {
      setReviewFor(null);
      setReviewForm({ rating: 5, comment: '' });
      alert('Review submitted!');
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to submit review');
    }
  }

  if (user === undefined) return <p className="muted">Loading...</p>;

  return (
    <div>
      <h2>{user?.role === 'caregiver' ? 'My Jobs' : 'My Bookings'}</h2>

      <table className="card">
        <thead>
          <tr>
            <th>Date / Time</th>
            <th>Pet</th>
            <th>Service</th>
            {user?.role !== 'caregiver' && <th>Caregiver</th>}
            {user?.role === 'caregiver' && <th>Owner</th>}
            <th>Amount</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.booking_id}>
              <td>{b.booking_date} {b.booking_time}</td>
              <td>{b.pet_name}</td>
              <td>{b.service_name}</td>
              {user?.role !== 'caregiver' && <td>{b.caregiver_name}</td>}
              {user?.role === 'caregiver' && <td>{b.owner_name}</td>}
              <td>₹{b.amount}</td>
              <td><span className={`badge ${b.status}`}>{b.status}</span></td>
              <td>{b.payment_status || '—'}</td>
              <td>
                {user?.role === 'owner' && !['completed', 'cancelled'].includes(b.status) && (
                  <button className="danger" onClick={() => updateStatus(b.booking_id, 'cancelled')}>Cancel</button>
                )}
                {user?.role === 'owner' && b.status === 'completed' && (
                  <button className="secondary" onClick={() => setReviewFor(b.booking_id)}>Leave Review</button>
                )}
                {user?.role === 'caregiver' && CAREGIVER_NEXT[b.status] && (
                  <button onClick={() => updateStatus(b.booking_id, CAREGIVER_NEXT[b.status])}>
                    Mark {CAREGIVER_NEXT[b.status]}
                  </button>
                )}
                {user?.role === 'caregiver' && !['completed', 'cancelled'].includes(b.status) && (
                  <button className="danger" onClick={() => updateStatus(b.booking_id, 'cancelled')}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr><td colSpan={8} className="muted">No bookings yet.</td></tr>
          )}
        </tbody>
      </table>

      {reviewFor && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h3>Leave a Review</h3>
          <form onSubmit={submitReview}>
            <label>Rating (1-5)</label>
            <input type="number" min="1" max="5" value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })} />
            <label>Comment</label>
            <textarea rows={3} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
            <button type="submit">Submit</button>
            <button type="button" className="secondary" onClick={() => setReviewFor(null)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}
