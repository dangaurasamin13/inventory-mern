import { useState } from 'react';
import { api } from './api';
import { Page, Table, useLoad, useMsg, fmt } from './ui';

function StockForm({ title, path, type, noteLabel, btn, ok }) {
  const [products, loadP] = useLoad('/products');
  const [hist, loadH] = useLoad(`/transactions?type=${encodeURIComponent(type)}&limit=50`);
  const [f, setF] = useState({ product: '', quantity: '', note: '' });
  const [m, say] = useMsg();
  const submit = async (e) => {
    e.preventDefault();
    try { await api(path, 'POST', f); say(ok); setF({ product: '', quantity: '', note: '' }); loadP(); loadH(); }
    catch (err) { say(err.message, false); }
  };
  return (
    <Page title={title} m={m}>
      <form onSubmit={submit} className="card card-body mb-4 row g-3 flex-row">
        <div className="col-md-4"><label className="form-label">Product</label>
          <select className="form-select" required value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })}>
            <option value="">Select product</option>
            {(products || []).map((p) => <option key={p._id} value={p._id}>{p.name} (stock: {p.quantity})</option>)}
          </select></div>
        <div className="col-md-2"><label className="form-label">Quantity</label>
          <input className="form-control" type="number" min="1" required value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
        <div className="col-md-4"><label className="form-label">{noteLabel}</label>
          <input className="form-control" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <div className="col-md-2 d-flex align-items-end"><button className={`btn btn-${btn} w-100`}>Save</button></div>
      </form>
      <Table head={['Date', 'Item', 'Quantity', noteLabel, 'User']} rows={hist}
        row={(t) => [fmt(t.createdAt), t.product?.name, t.quantity, t.note, t.user?.name]} />
    </Page>
  );
}
export const StockIn = () => <StockForm title="Stock In" path="/stock-in" type="Stock In" noteLabel="Note" btn="primary" ok="Stock added." />;
// recording damaged/lost stock automatically deducts it: this is the automatic stock-out
export const Damaged = () => <StockForm title="Damaged / Lost Stock" path="/damaged" type="Damage" noteLabel="Reason" btn="danger" ok="Recorded. Stock was reduced automatically." />;
