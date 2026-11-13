import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from './api';
import { getToken, setSession } from './session';

function Shell({ title, sub, children }) {
  return (
    <div className="auth">
      <div className="auth-art d-none d-lg-flex">
        <div>
          <div className="auth-logo"><i className="bi bi-box-seam" /></div>
          <h1>Inventory Management System</h1>
          <p>Track products, purchases and stock levels in one place.</p>
          <ul>
            <li><i className="bi bi-check2-circle" />Live stock levels and low-stock alerts</li>
            <li><i className="bi bi-check2-circle" />Purchase orders that update stock automatically</li>
            <li><i className="bi bi-check2-circle" />Separate access for admins and staff</li>
          </ul>
        </div>
      </div>
      <div className="auth-form">
        <div className="auth-card">
          <h3 className="fw-bold mb-1">{title}</h3>
          <p className="text-muted mb-4">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, right, ...props }) {
  return (
    <div className="input-group mb-3">
      <span className="input-group-text"><i className={`bi bi-${icon}`} /></span>
      <input className="form-control" {...props} />{right}
    </div>
  );
}

function PasswordField(props) {
  const [show, setShow] = useState(false);
  return (
    <Field icon="lock" type={show ? 'text' : 'password'} {...props}
      right={<button type="button" className="btn btn-outline-secondary" tabIndex={-1} onClick={() => setShow(!show)}><i className={`bi bi-eye${show ? '-slash' : ''}`} /></button>} />
  );
}

export function Login() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState(sp.get('expired') ? 'Your session ended. Please log in again.' : '');
  const [busy, setBusy] = useState(false);
  if (getToken()) return <Navigate to="/dashboard" />;

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await api('/auth/login', 'POST', f);
      setSession(d);                      // start the session (this tab only)
      nav('/dashboard');
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <Shell title="Welcome back" sub="Log in to manage your inventory.">
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <form onSubmit={submit}>
        <Field icon="person" placeholder="Username or email" required autoFocus value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <PasswordField placeholder="Password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="text-center text-muted mt-4 mb-0">New here? <Link to="/signup">Create an account</Link></p>
    </Shell>
  );
}

export function Signup() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', username: '', email: '', password: '', confirm: '', role: 'staff', adminCode: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (getToken()) return <Navigate to="/dashboard" />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.password !== f.confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      const d = await api('/auth/signup', 'POST', f);
      setSession(d);                      // signing up also starts a session
      nav('/dashboard');
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <Shell title="Create your account" sub="Choose your role and get started.">
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <form onSubmit={submit}>
        <div className="row g-2 mb-3">
          {[['staff', 'person', 'Staff', 'Day-to-day stock work'], ['admin', 'shield-lock', 'Admin', 'Full access']].map(([v, icon, t, s]) => (
            <div className="col-6" key={v}>
              <button type="button" className={`role-card ${f.role === v ? 'on' : ''}`} onClick={() => setF({ ...f, role: v })}>
                <i className={`bi bi-${icon}`} /><b>{t}</b><small>{s}</small>
              </button>
            </div>
          ))}
        </div>
        {f.role === 'admin' && <Field icon="key" placeholder="Admin code" required value={f.adminCode} onChange={set('adminCode')} />}
        <Field icon="person-badge" placeholder="Full name" required value={f.name} onChange={set('name')} />
        <Field icon="at" placeholder="Username" required value={f.username} onChange={set('username')} />
        <Field icon="envelope" type="email" placeholder="Email" required value={f.email} onChange={set('email')} />
        <PasswordField placeholder="Password (min 6 characters)" required minLength={6} value={f.password} onChange={set('password')} />
        <PasswordField placeholder="Confirm password" required value={f.confirm} onChange={set('confirm')} />
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Creating account...' : 'Sign up'}</button>
      </form>
      <p className="text-center text-muted mt-4 mb-0">Already have an account? <Link to="/login">Log in</Link></p>
    </Shell>
  );
}
