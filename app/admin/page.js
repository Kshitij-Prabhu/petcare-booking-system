'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats(d);
      });
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!stats) return <p className="muted">Loading...</p>;

  const { counts, workload, statusBreakdown, avgPlatformRating } = stats;

  return (
    <div>
      <h2>Admin Panel</h2>

      <div className="grid grid-2">
        <div className="card">
          <h3>Platform Totals</h3>
          <p>Owners: {counts.total_owners}</p>
          <p>Caregivers: {counts.total_caregivers}</p>
          <p>Pets: {counts.total_pets}</p>
          <p>Bookings: {counts.total_bookings}</p>
          <p>Revenue (completed): ₹{counts.total_revenue}</p>
          {avgPlatformRating && (
            <p>Avg Rating: {avgPlatformRating.avg_rating?.toFixed(2)} ({avgPlatformRating.total_reviews} reviews)</p>
          )}
        </div>

        <div className="card">
          <h3>Bookings by Status</h3>
          {statusBreakdown.map((s) => (
            <p key={s.status}><span className={`badge ${s.status}`}>{s.status}</span> — {s.count}</p>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Caregiver Workload</h3>
        <table>
          <thead>
            <tr><th>Caregiver</th><th>Total Bookings</th><th>Completed</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {workload.map((w) => (
              <tr key={w.caregiver_id}>
                <td>{w.caregiver_name}</td>
                <td>{w.total_bookings}</td>
                <td>{w.completed_count}</td>
                <td>₹{w.total_revenue || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
