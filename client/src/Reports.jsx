import { useState } from 'react';
import { Page, Table, useLoad, Status } from './ui';

export default function Reports() {
  const [products] = useLoad('/products');
  const [q, setQ] = useState({ from: '', to: '', type: '' });
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();
  const [tx] = useLoad('/transactions' + (qs ? '?' + qs : ''));
  return (
    <Page title="Reports">
      <button className="btn btn-outline-secondary mb-3 no-print" onClick={() => print()}><i className="bi bi-printer" /> Print</button>
      <h5>Stock report</h5>
      <Table head={['Product', 'Category', 'Stock', 'Low-stock level', 'Value', 'Status']} rows={products}
        row={(p) => [p.name, p.category?.name, p.quantity, p.reorderLevel, (p.quantity * p.price).toFixed(2), <Status p={p} />]} />
      <h5 className="mt-4">Transactions</h5>
      <div className="row g-2 mb-3 no-print">
        <div className="col-auto"><input type="date" className="form-control" value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })} /></div>
        <div className="col-auto"><input type="date" className="form-control" value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })} /></div>
        <div className="col-auto"><select className="form-select" value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value })}>
          <option value="">All types</option>{['Stock In', 'Purchase', 'Damage', 'Stock Out'].map((t) => <option key={t}>{t}</option>)}</select></div>
      </div>
      <Table head={['Date', 'Type', 'Item', 'Quantity', 'Note', 'User']} rows={tx}
        row={(t) => [new Date(t.createdAt).toLocaleString(), t.type, t.product?.name, t.quantity, t.note, t.user?.name]} />
    </Page>
  );
}
