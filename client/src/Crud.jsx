import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './api';
import { Page, Table, useLoad, useMsg } from './ui';

// One reusable add / edit / delete page (products, categories, suppliers, users)
export default function Crud({ title, path, fields, columns }) {
  const [sp] = useSearchParams();
  const filter = sp.get('filter');
  const [rows, load] = useLoad(path + (filter ? `?filter=${filter}` : ''));
  const empty = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [opts, setOpts] = useState({});
  const [m, say] = useMsg();

  useEffect(() => {
    fields.filter((f) => f.optionsPath).forEach((f) => api(f.optionsPath).then((d) => setOpts((o) => ({ ...o, [f.name]: d }))));
  }, []);

  const reset = () => { setEditId(null); setForm(empty); };
  const edit = (r) => {
    setEditId(r._id);
    setForm(Object.fromEntries(fields.map((f) => [f.name, f.type === 'password' ? '' : r[f.name]?._id ?? r[f.name] ?? ''])));
    window.scrollTo(0, 0);
  };
  const save = async (e) => {
    e.preventDefault();
    const body = { ...form };
    fields.forEach((f) => { if (body[f.name] === '') body[f.name] = f.type === 'select' ? null : f.type === 'number' ? undefined : ''; });
    try {
      await api(editId ? `${path}/${editId}` : path, editId ? 'PUT' : 'POST', body);
      say('Saved.'); reset(); load();
    } catch (err) { say(err.message, false); }
  };
  const del = async (r) => {
    if (!confirm('Delete this record?')) return;
    try { await api(`${path}/${r._id}`, 'DELETE'); say('Deleted.'); load(); } catch (err) { say(err.message, false); }
  };

  return (
    <Page title={title} m={m}>
      <form onSubmit={save} className="card card-body mb-4 row g-3 flex-row">
        <div className="col-12 fw-semibold">{editId ? 'Edit' : 'Add new'}</div>
        {fields.map((f) => (
          <div className="col-md-4" key={f.name}>
            <label className="form-label">{f.label}</label>
            {f.type === 'select' ? (
              <select className="form-select" value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                <option value="">-</option>
                {(f.options || opts[f.name] || []).map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            ) : (
              <input className="form-control" type={f.type || 'text'} step="any" value={form[f.name]}
                required={f.required || (f.requiredOnCreate && !editId)}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
            )}
          </div>
        ))}
        <div className="col-12">
          <button className="btn btn-primary me-2">Save</button>
          {editId && <button type="button" className="btn btn-light" onClick={reset}>Cancel</button>}
        </div>
      </form>
      <Table head={[...columns.map((c) => c.h), '']} rows={rows} row={(r) => [
        ...columns.map((c) => c.f(r)),
        <div className="text-end text-nowrap">
          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => edit(r)}>Edit</button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => del(r)}>Delete</button>
        </div>,
      ]} />
    </Page>
  );
}
