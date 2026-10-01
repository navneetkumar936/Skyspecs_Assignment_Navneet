import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { gql, rest } from '../api';
import { useAuth } from '../auth';

interface Turbine { id: string; name: string; manufacturer: string | null; mwRating: number | null; lat: number | null; lng: number | null }

const EMPTY = { name: '', manufacturer: '', mwRating: '', lat: '', lng: '' };

export default function Turbines() {
  const { isAdmin } = useAuth();
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    gql<{ turbines: Turbine[] }>('{ turbines { id name manufacturer mwRating lat lng } }')
      .then((d) => setTurbines(d.turbines)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function startEdit(t: Turbine) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      manufacturer: t.manufacturer ?? '',
      mwRating: t.mwRating != null ? String(t.mwRating) : '',
      lat: t.lat != null ? String(t.lat) : '',
      lng: t.lng != null ? String(t.lng) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const num = (v: string) => (v === '' ? undefined : Number(v));
    const body = {
      name: form.name,
      manufacturer: form.manufacturer || undefined,
      mwRating: num(form.mwRating),
      lat: num(form.lat),
      lng: num(form.lng),
    };
    try {
      if (editingId) await rest('PATCH', `/turbines/${editingId}`, body);
      else await rest('POST', '/turbines', body);
      reset();
      load();
    } catch (err) { setError((err as Error).message); }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <h1>Turbines<span style={{ fontSize: '15px' }}> (Managed by admin only)</span></h1>
      {error && <p className="error" role="alert">{error}</p>}
      {isAdmin && (
        <form onSubmit={submit} className="row card">
          <input placeholder="Name *" value={form.name} onChange={set('name')} required />
          <input placeholder="Manufacturer" value={form.manufacturer} onChange={set('manufacturer')} />
          <input placeholder="MW rating" type="number" step="any" value={form.mwRating} onChange={set('mwRating')} />
          <input placeholder="Lat" type="number" step="any" value={form.lat} onChange={set('lat')} />
          <input placeholder="Lng" type="number" step="any" value={form.lng} onChange={set('lng')} />
          <button type="submit">{editingId ? 'Update turbine' : 'Add turbine'}</button>
          {editingId && <button type="button" onClick={reset}>Cancel</button>}
        </form>
      )}
      <table>
        <thead><tr><th>Name</th><th>Manufacturer</th><th>MW</th><th>Location</th><th /></tr></thead>
        <tbody>
          {turbines.map((t) => (
            <tr key={t.id} className={t.id === editingId ? 'editing' : undefined}>
              <td>{t.name}</td><td>{t.manufacturer ?? '-'}</td><td>{t.mwRating ?? '-'}</td>
              <td>{t.lat != null && t.lng != null ? `${t.lat}, ${t.lng}` : '-'}</td>
              <td>{isAdmin && <button onClick={() => startEdit(t)}>Edit</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}