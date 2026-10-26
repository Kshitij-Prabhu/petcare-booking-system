'use client';

import { useEffect, useState } from 'react';

export default function CaregiversPage() {
  const [caregivers, setCaregivers] = useState([]);

  useEffect(() => {
    fetch('/api/caregivers')
      .then((r) => r.json())
      .then((d) => setCaregivers(d.caregivers || []));
  }, []);

  return (
    <div>
      <h2>Caregivers</h2>
      <div className="grid grid-2">
        {caregivers.map((c) => (
          <div className="card" key={c.caregiver_id}>
            <h3>{c.name}</h3>
            <p className="muted">{c.specialization || 'General pet care'}</p>
            <p className="muted">{c.experience_years} yrs experience</p>
            <p>
              {c.avg_rating ? (
                <span className="stars">{'★'.repeat(Math.round(c.avg_rating))}{'☆'.repeat(5 - Math.round(c.avg_rating))}</span>
              ) : (
                <span className="muted">No reviews yet</span>
              )}
              {c.avg_rating && <span className="muted"> {c.avg_rating} ({c.review_count} reviews)</span>}
            </p>
            <p className="muted">
              Completed: {c.completed_bookings || 0} · Cancelled: {c.cancelled_bookings || 0}
            </p>
            {c.bio && <p className="muted">{c.bio}</p>}
          </div>
        ))}
        {caregivers.length === 0 && <p className="muted">No caregivers registered yet.</p>}
      </div>
    </div>
  );
}
