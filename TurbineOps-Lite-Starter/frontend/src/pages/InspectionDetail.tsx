import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gql, rest } from '../api';
import { useAuth } from '../auth';
import { connectEvents } from '../sse';

interface Finding { id: string; category: string; severity: number; estimatedCost: number; notes: string | null }
interface Plan { priority: string; totalEstimatedCost: number; maxSeverity: number; findingCount: number; createdAt: string }
interface Detail {
  id: string; date: string; dataSource: string; inspectorName: string | null; rawPackageUrl: string | null;
  turbine: { name: string }; findings: Finding[]; repairPlan: Plan | null;
}

const Q = `query($id: ID!) { inspection(id: $id) {
  id date dataSource inspectorName rawPackageUrl turbine { name }
  findings { id category severity estimatedCost notes }
  repairPlan { priority totalEstimatedCost maxSeverity findingCount createdAt }
} }`;
const CATEGORIES = ['BLADE_DAMAGE', 'LIGHTNING', 'EROSION', 'UNKNOWN'];

export default function InspectionDetail() {
  const { id = '' } = useParams();
  const { canWrite } = useAuth();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [nf, setNf] = useState({ category: 'BLADE_DAMAGE', severity: '3', estimatedCost: '', notes: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [ef, setEf] = useState({ severity: '', estimatedCost: '', notes: '' });
  const [q, setQ] = useState('');          // text in the box
  const [applied, setApplied] = useState(''); // search currently applied
  const [hits, setHits] = useState<Finding[] | null>(null);

  const load = useCallback(
    () => gql<{ inspection: Detail | null }>(Q, { id }).then((r) => setD(r.inspection)).catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => { load(); }, [load]);
  useEffect(() => connectEvents((name, data) => { if (name === 'plan' && data?.inspectionId === id) load(); }), [id, load]);
  useEffect(() => {
    if (!applied) { setHits(null); return; }
    gql<{ searchFindings: Finding[] }>(
        `query($q: String!, $id: ID) {
        searchFindings(q: $q, inspectionId: $id) { id category severity estimatedCost notes }
        }`,
        { q: applied, id },
    ).then((r) => setHits(r.searchFindings)).catch((e) => setError(e.message));
  }, [applied, id, d]);

  const locked = !!d?.repairPlan;

  async function run(fn: () => Promise<unknown>) {
    setError(''); setInfo('');
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); }
  }

  const addFinding = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const sent = Number(nf.severity);
      const created = await rest<Finding>('POST', `/inspections/${id}/findings`, {
        category: nf.category, severity: sent, estimatedCost: Number(nf.estimatedCost), notes: nf.notes || null,
      });
      if (created.severity > sent) setInfo(`Raised to ${created.severity} by crack rule`);
      setNf({ ...nf, estimatedCost: '', notes: '' });
    });
  };

  const saveEdit = (fid: string) =>
    run(async () => {
      const sent = Number(ef.severity);
      const updated = await rest<Finding>('PATCH', `/findings/${fid}`, {
        severity: sent, estimatedCost: Number(ef.estimatedCost), notes: ef.notes || null,
      });
      if (updated.severity > sent) setInfo(`Raised to ${updated.severity} by crack rule`);
      setEditing(null);
    });

  if (!d) return <p>{error || 'Loading…'}</p>;

  const rows = hits ?? d.findings;

  return (
    <>
      <p><Link to="/">← Inspections</Link></p>
      <h1>{d.turbine.name} · {d.date}</h1>
      <p>{d.dataSource} · Inspector: {d.inspectorName ?? '-'} · Package: {d.rawPackageUrl ?? '-'}</p>
      {error && <p className="error" role="alert">{error}</p>}
      {info && <p className="info">{info}</p>}
      {locked && <p className="info">Locked: A repair plan exists. Delete the plan to edit findings.</p>}

      <h2>Findings</h2>
      <form
        onSubmit={(e) => { e.preventDefault(); setApplied(q.trim()); }}
        className="row"
        >
        <input placeholder="Search notes (e.g. crack)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit">Search</button>
      {applied && <button type="button" onClick={() => { setQ(''); setApplied(''); }}>Clear</button>}
      </form>
      {applied && <p className="info">Showing findings matching "{applied}"</p>}
      <table>
        <thead><tr><th>Category</th><th>Severity</th><th>Cost</th><th>Notes</th><th /></tr></thead>
        <tbody>
          {rows.map((f) => editing === f.id ? (
            <tr key={f.id}>
              <td>{f.category}</td>
              <td><input type="number" min={1} max={5} value={ef.severity} onChange={(e) => setEf({ ...ef, severity: e.target.value })} /></td>
              <td><input type="number" step="any" value={ef.estimatedCost} onChange={(e) => setEf({ ...ef, estimatedCost: e.target.value })} /></td>
              <td><input value={ef.notes} onChange={(e) => setEf({ ...ef, notes: e.target.value })} /></td>
              <td><button onClick={() => saveEdit(f.id)}>Save</button> <button onClick={() => setEditing(null)}>Cancel</button></td>
            </tr>
          ) : (
            <tr key={f.id}>
              <td>{f.category}</td><td>{f.severity}</td><td>{f.estimatedCost}</td><td>{f.notes ?? '-'}</td>
              <td>{canWrite && !locked && (
                <button onClick={() => { setEditing(f.id); setEf({ severity: String(f.severity), estimatedCost: String(f.estimatedCost), notes: f.notes ?? '' }); }}>Edit</button>
              )}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5}>{applied ? 'No findings match your search' : 'No findings yet'}</td></tr>}
        </tbody>
      </table>

      {canWrite && !locked && (
        <form onSubmit={addFinding} className="row card">
          <select value={nf.category} onChange={(e) => setNf({ ...nf, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" min={1} max={5} aria-label="Severity" value={nf.severity} onChange={(e) => setNf({ ...nf, severity: e.target.value })} required />
          <input type="number" step="any" min={0} placeholder="Cost *" value={nf.estimatedCost} onChange={(e) => setNf({ ...nf, estimatedCost: e.target.value })} required />
          <input placeholder="Notes" value={nf.notes} onChange={(e) => setNf({ ...nf, notes: e.target.value })} />
          <button type="submit">Add finding</button>
        </form>
      )}

      <h2>Repair plan</h2>
      {d.repairPlan ? (
        <div className="card">
          <p><strong className={`prio ${d.repairPlan.priority}`}>{d.repairPlan.priority}</strong> priority</p>
          <p>Total cost: {d.repairPlan.totalEstimatedCost} · Max severity: {d.repairPlan.maxSeverity} · Findings: {d.repairPlan.findingCount}</p>
          <p>Generated: {new Date(d.repairPlan.createdAt).toLocaleString()}</p>
          {canWrite && <button onClick={() => run(() => rest('DELETE', `/inspections/${id}/repair-plan`))}>Delete plan (unlock)</button>}
        </div>
      ) : (
        <div className="card">
          <p>No plan generated.</p>
          {canWrite && <button onClick={() => run(() => rest('POST', `/inspections/${id}/repair-plan`))}>Generate repair plan</button>}
        </div>
      )}
    </>
  );
}