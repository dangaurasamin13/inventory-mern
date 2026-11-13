import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import { api } from './api';
import Crud from './Crud';
import Dashboard from './Dashboard';
import { PurchaseOrders, Purchases } from './Purchasing';
import { StockIn, Damaged } from './StockPages';
import Reports from './Reports';
import Settings from './Settings';
import { Status } from './ui';
import { Login, Signup } from './Auth';
import { getToken, getUser, clearSession, setSession, updateUser } from './session';

const IDLE_MS = 30 * 60 * 1000;   // log out after 30 minutes without activity

const MENU = [
  ['/dashboard', 'Dashboard', 'speedometer2'], ['/products', 'Products', 'box-seam'], ['/categories', 'Categories', 'tags'],
  ['/suppliers', 'Suppliers', 'people'], ['/purchase-orders', 'Purchase Orders', 'file-earmark-text'], ['/purchases', 'Purchases', 'bag-check'],
  ['/stock-in', 'Stock In', 'box-arrow-in-down'], ['/damaged', 'Damaged / Lost Stock', 'exclamation-triangle'], ['/reports', 'Reports', 'bar-chart'],
  ['/users', 'Users', 'person-gear', true], ['/settings', 'Settings', 'gear'],
];

function Layout() {
  const [user, setUser] = useState(getUser());
  const [s, setS] = useState({ appName: 'Inventory Management System' });
  const loadS = () => api('/settings').then(setS).catch(() => {});
  useEffect(() => {              // re-check the session with the server on every page load
    if (!getToken()) return;
    api('/auth/me').then((u) => { updateUser(u); setUser(u); }).catch(() => {});
    loadS();
  }, []);
  const logout = (expired) => { clearSession(); location.href = expired === true ? '/login?expired=1' : '/login'; };

  useEffect(() => {              // stay logged in while active, log out when idle
    if (!getToken()) return;
    let last = Date.now(), refreshed = Date.now();
    const touch = () => { last = Date.now(); };
    const evs = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = setInterval(async () => {
      const now = Date.now();
      if (now - last > IDLE_MS) return logout(true);
      if (last > refreshed && now - refreshed > 4 * 60 * 1000) {      // active since the last renewal
        try { setSession(await api('/auth/refresh', 'POST')); refreshed = now; } catch { /* a 401 logs out in api.js */ }
      }
    }, 30000);
    return () => { evs.forEach((e) => window.removeEventListener(e, touch)); clearInterval(timer); };
  }, []);

  if (!user || !getToken()) return <Navigate to="/login" />;
  return (
    <>
      <div className="topbar">
        <span>{s.appName}</span>
        <span><i className="bi bi-person-circle" /> {user.name} <span className="badge bg-primary text-capitalize ms-1">{user.role}</span></span>
      </div>
      <div className="wrap">
        <nav className="side">
          {MENU.filter((m) => !m[3] || user.role === 'admin').map((m) => (
            <NavLink key={m[0]} to={m[0]}><i className={`bi bi-${m[2]}`} />{m[1]}</NavLink>
          ))}
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}><i className="bi bi-box-arrow-left" />Logout</a>
        </nav>
        <main className="main"><Outlet context={{ s, loadS, user, setUser }} /></main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Crud key="p" title="Products" path="/products"
          fields={[
            { name: 'name', label: 'Name', required: true }, { name: 'sku', label: 'SKU' },
            { name: 'category', label: 'Category', type: 'select', optionsPath: '/categories' },
            { name: 'supplier', label: 'Supplier', type: 'select', optionsPath: '/suppliers' },
            { name: 'price', label: 'Price', type: 'number' }, { name: 'reorderLevel', label: 'Low-stock level', type: 'number' },
          ]}
          columns={[
            { h: 'Name', f: (r) => r.name }, { h: 'SKU', f: (r) => r.sku }, { h: 'Category', f: (r) => r.category?.name },
            { h: 'Supplier', f: (r) => r.supplier?.name }, { h: 'Price', f: (r) => r.price }, { h: 'Stock', f: (r) => r.quantity },
            { h: 'Status', f: (r) => <Status p={r} /> },
          ]} />} />
        <Route path="categories" element={<Crud key="c" title="Categories" path="/categories"
          fields={[{ name: 'name', label: 'Category name', required: true }]} columns={[{ h: 'Name', f: (r) => r.name }]} />} />
        <Route path="suppliers" element={<Crud key="s" title="Suppliers" path="/suppliers"
          fields={[{ name: 'name', label: 'Name', required: true }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'address', label: 'Address' }]}
          columns={[{ h: 'Name', f: (r) => r.name }, { h: 'Phone', f: (r) => r.phone }, { h: 'Email', f: (r) => r.email }, { h: 'Address', f: (r) => r.address }]} />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="stock-in" element={<StockIn />} />
        <Route path="damaged" element={<Damaged />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Crud key="u" title="Users" path="/users"
          fields={[
            { name: 'name', label: 'Full name', required: true }, { name: 'username', label: 'Username', required: true }, { name: 'email', label: 'Email', type: 'email' },
            { name: 'password', label: 'Password (blank = keep)', type: 'password', requiredOnCreate: true },
            { name: 'role', label: 'Role', type: 'select', options: [{ _id: 'staff', name: 'Staff' }, { _id: 'admin', name: 'Admin' }] },
          ]}
          columns={[{ h: 'Name', f: (r) => r.name }, { h: 'Username', f: (r) => r.username }, { h: 'Email', f: (r) => r.email }, { h: 'Role', f: (r) => r.role }]} />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
