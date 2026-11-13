import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useLoad(path) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api(path).then(setData).catch(() => setData([])), [path]);
  useEffect(() => { load(); }, [load]);
  return [data, load];
}
export function useMsg() {
  const [m, set] = useState(null);
  return [m, (text, ok = true) => set({ text, ok })];
}
export const Page = ({ title, m, children }) => (
  <>
    <h3 className="mb-3">{title}</h3>
    {m && <div className={`alert alert-${m.ok ? 'success' : 'danger'}`}>{m.text}</div>}
    {children}
  </>
);
export const poNo = (n) => 'PO-' + String(n).padStart(4, '0');
export const fmt = (d) => new Date(d).toLocaleDateString();
export const Status = ({ p }) =>
  p.quantity === 0 ? <span className="text-danger fw-semibold">Out of stock</span>
  : p.quantity <= p.reorderLevel ? <span className="text-warning fw-semibold">Low</span> : 'In stock';

export function Table({ head, rows, row }) {
  if (!rows) return <p className="text-muted">Loading...</p>;
  if (!rows.length) return <p className="text-muted">No records yet.</p>;
  return (
    <div className="card"><div className="table-responsive"><table className="table table-hover mb-0">
      <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r._id}>{row(r).map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
    </table></div></div>
  );
}
