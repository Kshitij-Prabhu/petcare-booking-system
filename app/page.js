import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <div className="card">
        <h1>Pet-Care Service Booking &amp; Tracking System</h1>
        <p className="muted">
          Book trusted caregivers for grooming, walking, boarding and vet visits —
          with real-time availability, status tracking and caregiver reviews.
        </p>
        <Link href="/register"><button>Get Started</button></Link>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>For Pet Owners</h3>
          <p className="muted">Register your pets, browse services, book a caregiver for a specific date/time, and track booking status end-to-end.</p>
        </div>
        <div className="card">
          <h3>For Caregivers</h3>
          <p className="muted">See your upcoming jobs, update booking status as you work, and build a rating history from owner reviews.</p>
        </div>
      </div>
    </div>
  );
}
