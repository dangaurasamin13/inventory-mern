import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from './api';
import { updateUser } from './session';
import { Page, useMsg } from './ui';

const Note = ({ m }) => (m ? <div className={`alert alert-${m.ok ? 'success' : 'danger'} py-2`}>{m.text}</div> : null);
const blankPw = { currentPassword: '', newPassword: '', confirm: '' };

export default function Settings() {
  const { s, loadS, user, setUser } = useOutletContext();
  const [p, setP] = useState({ name: user.name || '', email: user.email || '' });
  const [pw, setPw] = useState(blankPw);
  const [app, setApp] = useState(s.appName);
  const [m1, say1] = useMsg(), [m2, say2] = useMsg(), [m3, say3] = useMsg();
  useEffect(() => setP({ name: user.name || '', email: user.email || '' }), [user]);
  useEffect(() => setApp(s.appName), [s.appName]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try { const u = await api('/auth/profile', 'PUT', p); updateUser(u); setUser(u); say1('Profile updated.'); }
    catch (err) { say1(err.message, false); }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return say2('New passwords do not match.', false);
    try { await api('/auth/password', 'PUT', { currentPassword: pw.currentPassword, newPassword: pw.newPassword }); setPw(blankPw); say2('Password changed.'); }
    catch (err) { say2(err.message, false); }
  };
  const saveSystem = async (e) => {
    e.preventDefault();
    try { await api('/settings', 'PUT', { appName: app }); loadS(); say3('System name saved.'); } catch (err) { say3(err.message, false); }
  };

  return (
    <Page title="Settings">
      <div className="row g-4">
        <div className="col-lg-6">
          <form onSubmit={saveProfile} className="card card-body h-100">
            <h5 className="mb-3"><i className="bi bi-person-lines-fill me-2" />Profile Information</h5>
            <Note m={m1} />
            <label className="form-label">Name</label>
            <input className="form-control mb-3" required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
            <label className="form-label">Email</label>
            <input className="form-control mb-3" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} />
            <label className="form-label">Role</label>
            <input className="form-control mb-3 text-capitalize" value={user.role} disabled />
            <div><button className="btn btn-primary">Save Changes</button></div>
          </form>
        </div>
        <div className="col-lg-6">
          <form onSubmit={changePassword} className="card card-body h-100">
            <h5 className="mb-3"><i className="bi bi-shield-lock me-2" />Change Password</h5>
            <Note m={m2} />
            <label className="form-label">Current Password</label>
            <input className="form-control mb-3" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <label className="form-label">New Password</label>
            <input className="form-control mb-3" type="password" required minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            <label className="form-label">Confirm Password</label>
            <input className="form-control mb-3" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            <div><button className="btn btn-primary">Change Password</button></div>
          </form>
        </div>
        {user.role === 'admin' && (
          <div className="col-lg-6">
            <form onSubmit={saveSystem} className="card card-body">
              <h5 className="mb-3"><i className="bi bi-gear me-2" />System (admin only)</h5>
              <Note m={m3} />
              <label className="form-label">System name</label>
              <input className="form-control mb-3" value={app} onChange={(e) => setApp(e.target.value)} />
              <div><button className="btn btn-primary">Save</button></div>
            </form>
          </div>
        )}
      </div>
    </Page>
  );
}
