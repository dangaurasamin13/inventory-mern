import { useState } from 'react';
import { api } from './api';
import { Page, Table, useLoad, useMsg, poNo, fmt } from './ui';

const items = (o) => o.items.map((i) => `${i.product?.name} x ${i.quantity}`).join(', ');

export function PurchaseOrders() {
  const [orders, load] = useLoad('/purchase-orders');
  const [products] = useLoad('/products');
  const [suppliers] = useLoad('/suppliers');
  const blank = [{ product: '', quantity: '' }];
  const [supplier, setSupplier] = useState('');
  const [lines, setLines] = useState(blank);
  const [m, say] = useMsg();
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api('/purchase-orders', 'POST', { supplier: supplier || null, items: lines });
      say('Order created. Receive it on the Purchases page to add stock.');
      setLines(blank); setSupplier(''); load();
    } catch (err) { say(err.message, false); }
  };
  const del = async (o) => { if (confirm('Delete this order?')) { await api('/purchase-orders/' + o._id, 'DELETE'); load(); } };

  return (
    <Page title="Purchase Orders" m={m}>
      <form onSubmit={submit} className="card card-body mb-4">
        <div className="col-md-4 mb-3"><label className="form-label">Supplier</label>
          <select className="form-select" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">-</option>{(suppliers || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select></div>
        {lines.map((l, i) => (
          <div className="row g-2 mb-2" key={i}>
            <div className="col-md-5"><select className="form-select" value={l.product} onChange={(e) => setLine(i, 'product', e.target.value)}>
              <option value="">Select product</option>{(products || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
            <div className="col-md-2"><input className="form-control" type="number" min="1" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} /></div>
          </div>
        ))}
        <div><button type="button" className="btn btn-light btn-sm mb-3" onClick={() => setLines([...lines, ...blank])}>+ Add line</button></div>
        <div><button className="btn btn-primary">Create order</button></div>
      </form>
      <Table head={['PO #', 'Supplier', 'Date', 'Status', 'Items', '']} rows={orders}
        row={(o) => [poNo(o.number), o.supplier?.name, fmt(o.createdAt), o.status, items(o),
          o.status === 'pending' && <button className="btn btn-sm btn-outline-danger" onClick={() => del(o)}>Delete</button>]} />
    </Page>
  );
}

export function Purchases() {
  const [orders, load] = useLoad('/purchase-orders');
  const [m, say] = useMsg();
  const receive = async (o) => {
    try { await api(`/purchase-orders/${o._id}/receive`, 'POST'); say('Order received. Stock was added automatically.'); load(); }
    catch (err) { say(err.message, false); }
  };
  const pending = orders?.filter((o) => o.status === 'pending');
  const done = orders?.filter((o) => o.status === 'received');
  return (
    <Page title="Purchases" m={m}>
      <h5>Waiting to be received</h5>
      <Table head={['PO #', 'Supplier', 'Ordered', 'Items', '']} rows={pending}
        row={(o) => [poNo(o.number), o.supplier?.name, fmt(o.createdAt), items(o),
          <button className="btn btn-sm btn-success" onClick={() => receive(o)}>Mark received</button>]} />
      <h5 className="mt-4">Received</h5>
      <Table head={['PO #', 'Supplier', 'Ordered', 'Received', 'Items']} rows={done}
        row={(o) => [poNo(o.number), o.supplier?.name, fmt(o.createdAt), fmt(o.receivedAt), items(o)]} />
    </Page>
  );
}
