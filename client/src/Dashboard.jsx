import { Link } from 'react-router-dom';
import { getUser } from './session';
import { Page, Table, useLoad, fmt } from './ui';

export default function Dashboard() {
  const [d] = useLoad('/dashboard');
  const user = getUser() || {};
  if (!d || !d.recent) return <Page title="Dashboard"><p className="text-muted">Loading...</p></Page>;

  const cards = [
    ['Total Products', d.products, '/products', 'View all products', '#dbeafe', '#2563eb', 'box-seam'],
    ['Total Stock (Items)', d.stock.toLocaleString(), '/reports', 'View stock details', '#dcfce7', '#16a34a', 'boxes'],
    ['Low Stock Items', d.low, '/products?filter=low', 'View low stock', '#fef3c7', '#d97706', 'exclamation-triangle'],
    ['Total Suppliers', d.suppliers, '/suppliers', 'View suppliers', '#fee2e2', '#dc2626', 'person-badge'],
  ];
  const total = d.inStock + d.lowOnly + d.out || 1;
  const a = (d.inStock / total) * 100, b = a + (d.lowOnly / total) * 100;

  return (
    <Page title="Dashboard">
      <p className="text-muted">Welcome back, {user.name}! Here's what's happening with your inventory.</p>
      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-md-6 col-xl-3" key={c[0]}><div className="card p-3"><div className="stat">
            <div className="ico" style={{ background: c[4], color: c[5] }}><i className={`bi bi-${c[6]}`} /></div>
            <div><div className="text-muted">{c[0]}</div><div className="fs-3 fw-bold">{c[1]}</div><Link to={c[2]} className="small">{c[3]}</Link></div>
          </div></div></div>
        ))}
      </div>
      <div className="row g-3">
        <div className="col-lg-7"><div className="card card-body">
          <h5 className="mb-3">Recent Transactions</h5>
          <Table head={['Date', 'Type', 'Item', 'Quantity', 'User']} rows={d.recent}
            row={(t) => [fmt(t.createdAt), t.type, t.product?.name, t.quantity, t.user?.name]} />
          <div><Link to="/reports" className="btn btn-primary mt-3">View All Transactions</Link></div>
        </div></div>
        <div className="col-lg-5"><div className="card card-body">
          <h5 className="mb-3">Stock Summary (products)</h5>
          <div className="donut" style={{ background: `conic-gradient(#22a83a 0 ${a}%, #f59e0b ${a}% ${b}%, #dc2626 ${b}% 100%)` }}><div /></div>
          <ul className="list-unstyled mt-3 mb-0">
            <li><span className="badge" style={{ background: '#22a83a' }}>&nbsp;</span> In Stock ({d.inStock})</li>
            <li><span className="badge" style={{ background: '#f59e0b' }}>&nbsp;</span> Low Stock ({d.lowOnly})</li>
            <li><span className="badge" style={{ background: '#dc2626' }}>&nbsp;</span> Out of Stock ({d.out})</li>
          </ul>
          <div><Link to="/reports" className="btn btn-primary mt-3">View Stock Report</Link></div>
        </div></div>
      </div>
    </Page>
  );
}
