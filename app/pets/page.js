'use client';

import { useEffect, useState } from 'react';

const empty = { name: '', species: '', breed: '', age: '', gender: 'unknown' };

export default function PetsPage() {
  const [pets, setPets] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  async function loadPets() {
    const res = await fetch('/api/pets');
    const data = await res.json();
    setPets(data.pets || []);
  }

  useEffect(() => { loadPets(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not add pet');
      return;
    }
    setForm(empty);
    loadPets();
  }

  async function handleDelete(petId) {
    if (!confirm('Remove this pet?')) return;
    await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
    loadPets();
  }

  return (
    <div>
      <h2>My Pets</h2>

      <div className="card">
        <h3>Add a Pet</h3>
        <form onSubmit={handleSubmit} className="grid grid-2">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label>Species</label>
            <input placeholder="Dog, Cat, Bird..." value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} required />
          </div>
          <div>
            <label>Breed</label>
            <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </div>
          <div>
            <label>Age (years)</label>
            <input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div>
            <label>Gender</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </form>
        {error && <p className="error-text">{error}</p>}
        <button onClick={handleSubmit}>Add Pet</button>
      </div>

      <div className="grid grid-2">
        {pets.map((p) => (
          <div className="card" key={p.pet_id}>
            <h3>{p.name}</h3>
            <p className="muted">{p.species} {p.breed ? `· ${p.breed}` : ''}</p>
            <p className="muted">Age: {p.age ?? '—'} · Gender: {p.gender}</p>
            <button className="danger" onClick={() => handleDelete(p.pet_id)}>Remove</button>
          </div>
        ))}
        {pets.length === 0 && <p className="muted">No pets added yet.</p>}
      </div>
    </div>
  );
}
