import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { gql, rest } from '../api';
import { useAuth } from '../auth';

interface Row {
  id: string; date: string; dataSource: string; inspectorName: string | null; rawPackageUrl: string | null;
  turbine: { name: string }; repairPlan: { priority: string } | null;
}
interface Turbine { id: string; name: string }

const LIST = `query($turbineId: ID, $from: String, $to: String, $dataSource: DataSource) {
  inspections(turbineId: $turbineId, from: $from, to: $to, dataSource: $dataSource) {
    id date dataSource inspectorName rawPackageUrl turbine { name } repairPlan { priority }
  }
}`;

const EMPTY = { turbineId: '', date: '', dataSource: 'DRONE', inspectorName: '', rawPackageUrl: '' };

export default function Inspections() {
  const { canWrite } = useAuth();
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({ turbineId: '', from: '', to: '', dataSource: '' });
  const [n, setN] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    gql<{ turbines: Turbine[] }>('{ turbines { id name } }').then((d) => setTurbines(d.turbines)).catch((e) => setError(e.message));
  }, []);

  const load = () =>
    gql<{ inspections: Row[] }>(LIST, {
      turbineId: f.turbineId || null, from: f.from || null, to: f.to || null, dataSource: f.dataSource || null,
    }).then((d) => setRows(d.inspections)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(r: Row) {
    const t = turbines.find((x) => x.name === r.turbine.name);
    setEditingId(r.id);
    setN({
      turbineId: t?.id ?? '',
      date: r.date,
      dataSource: r.dataSource,
      inspectorName: r.inspectorName ?? '',
      rawPackageUrl: r.rawPackageUrl ?? '',
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setN(EMPTY);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        // null clears an optional field; turbine cannot be changed
        await rest('PATCH', `/inspections/${editingId}`, {
          date: n.date,
          dataSource: n.dataSource,
          inspectorName: n.inspectorName || null,
          rawPackageUrl: n.rawPackageUrl || null,
        });
        reset();
      } else {
        await rest('POST', '/inspections', {
          ...n,
          inspectorName: n.inspectorName || undefined,
          rawPackageUrl: n.rawPackageUrl || undefined,
        });
        setN({ ...n, inspectorName: '', rawPackageUrl: '' }); // keep turbine, date and source for quick repeat entry
      }
      load();
    } catch (err) { setError((err as Error).message); } // shows the friendly 409
  }

  return (
    <>
      <h1>Inspections</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row card">
        <select aria-label="Turbine filter" value={f.turbineId} onChange={(e) => setF({ ...f, turbineId: e.target.value })}>
          <option value="">All turbines</option>
          {turbines.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select aria-label="Data source filter" value={f.dataSource} onChange={(e) => setF({ ...f, dataSource: e.target.value })}>
          <option value="">All sources</option><option>DRONE</option><option>MANUAL</option>
        </select>
        <label>From <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
        <label>To <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
      </div>

      {canWrite && (
        <form onSubmit={submit} className="row card">
          <select
            aria-label="Turbine"
            value={n.turbineId}
            onChange={(e) => setN({ ...n, turbineId: e.target.value })}
            disabled={!!editingId}
            required
          >
            <option value="">Turbine *</option>
            {turbines.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" aria-label="Date" value={n.date} onChange={(e) => setN({ ...n, date: e.target.value })} required />
          <select aria-label="Data source" value={n.dataSource} onChange={(e) => setN({ ...n, dataSource: e.target.value })}>
            <option>DRONE</option><option>MANUAL</option>
          </select>
          <input placeholder="Inspector" value={n.inspectorName} onChange={(e) => setN({ ...n, inspectorName: e.target.value })} />
          <input type="url" placeholder="Raw package URL" value={n.rawPackageUrl} onChange={(e) => setN({ ...n, rawPackageUrl: e.target.value })} />
          <button type="submit">{editingId ? 'Update inspection' : 'New inspection'}</button>
          {editingId && <button type="button" onClick={reset}>Cancel</button>}
        </form>
      )}

      <table>
        <thead><tr><th>Date</th><th>Turbine</th><th>Source</th><th>Inspector</th><th>Plan</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.id === editingId ? 'editing' : undefined}>
              <td><Link to={`/inspections/${r.id}`}>{r.date}</Link></td>
              <td>{r.turbine.name}</td><td>{r.dataSource}</td><td>{r.inspectorName ?? '-'}</td>
              <td>{r.repairPlan ? `${r.repairPlan.priority}` : '-'}</td>
              <td>{canWrite && <button onClick={() => startEdit(r)}>Edit</button>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6}>No inspections found</td></tr>}
        </tbody>
      </table>
    </>
  );
}