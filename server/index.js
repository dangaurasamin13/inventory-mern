require('dotenv').config();
const express = require('express'), cors = require('cors'), mongoose = require('mongoose');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Category, Supplier, Product, PurchaseOrder, Transaction, Setting } = require('./models');

const SECRET = process.env.JWT_SECRET || 'change-me';
const SESSION_MINUTES = +process.env.SESSION_MINUTES || 30;   // idle time before a session ends
const app = express();
app.use(cors(), express.json());

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
const admin = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only' }));

/* ---------- auth (public: login + signup) ---------- */
const publicUser = (u) => ({ id: String(u._id), name: u.name, username: u.username, email: u.email || '', role: u.role });
// A session = a short-lived signed token. The app renews it while the person is active (see /auth/refresh),
// so it only ends after SESSION_MINUTES of inactivity.
const session = (u) => ({
  token: jwt.sign({ id: String(u._id), name: u.name, role: u.role }, SECRET, { expiresIn: SESSION_MINUTES + 'm' }),
  user: publicUser(u),
});
app.post('/api/auth/login', wrap(async (req, res) => {
  const id = String(req.body.username || '').trim();
  const u = await User.findOne({ $or: [{ username: id }, { email: id.toLowerCase() }] });   // username OR email
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) throw fail(401, 'Wrong username/email or password');
  res.json(session(u));
}));
app.post('/api/auth/signup', wrap(async (req, res) => {
  const { name, username, email, password, role, adminCode } = req.body;
  if (!name?.trim() || !username?.trim() || !email?.trim()) throw fail(400, 'Name, username and email are required');
  if (!password || password.length < 6) throw fail(400, 'Password must be at least 6 characters');
  let r = 'staff';
  if (role === 'admin') {                       // admin accounts need the secret code from server/.env
    const code = process.env.ADMIN_SIGNUP_CODE;
    if (!code || adminCode !== code) throw fail(403, 'Invalid admin code');
    r = 'admin';
  }
  const u = await User.create({ name, username, email, role: r, password: await bcrypt.hash(password, 10) });
  res.status(201).json(session(u));       // signing up also logs the person in
}));
app.use('/api', (req, res, next) => {            // everything below needs a valid token
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ message: 'Please log in' }); }
});

/* ---------- auth (logged in): session check, profile, password ---------- */
app.get('/api/auth/me', wrap(async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u) throw fail(401, 'Account no longer exists');
  res.json(publicUser(u));
}));
app.post('/api/auth/refresh', wrap(async (req, res) => {      // called by the app while the person is active
  const u = await User.findById(req.user.id);
  if (!u) throw fail(401, 'Account no longer exists');
  res.json(session(u));
}));
app.put('/api/auth/profile', wrap(async (req, res) => {
  const { name, email } = req.body;
  if (!name?.trim()) throw fail(400, 'Name is required');
  const upd = email?.trim() ? { $set: { name, email } } : { $set: { name }, $unset: { email: 1 } };
  const u = await User.findByIdAndUpdate(req.user.id, upd, { new: true, runValidators: true });
  res.json(publicUser(u));
}));
app.put('/api/auth/password', wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const u = await User.findById(req.user.id);
  if (!(await bcrypt.compare(currentPassword || '', u.password))) throw fail(400, 'Current password is incorrect');
  if (!newPassword || newPassword.length < 6) throw fail(400, 'New password must be at least 6 characters');
  u.password = await bcrypt.hash(newPassword, 10);
  await u.save();
  res.json({ ok: true });
}));

/* ---------- the ONLY place stock changes ----------
   Stock In / Purchase add. Damage / Stock Out subtract automatically (and never below 0). */
async function move(type, product, qty, user, note = '') {
  qty = Number(qty);
  if (!Number.isInteger(qty) || qty <= 0) throw fail(400, 'Quantity must be a whole number above 0');
  const add = ['Stock In', 'Purchase'].includes(type);
  const p = await Product.findOneAndUpdate(
    add ? { _id: product } : { _id: product, quantity: { $gte: qty } },
    { $inc: { quantity: add ? qty : -qty } }, { new: true });
  if (!p) throw fail(400, add ? 'Product not found' : 'Not enough stock');
  await Transaction.create({ type, product, quantity: qty, note, user });
  return p;
}

/* ---------- generic CRUD ---------- */
function crud(path, Model, { populate, clean = (b) => b, filter = () => ({}) } = {}) {
  const r = express.Router();
  r.get('/', wrap(async (req, res) => {
    let q = Model.find(filter(req)).sort({ createdAt: -1 });
    if (populate) q = q.populate(populate);
    res.json(await q);
  }));
  r.post('/', wrap(async (req, res) => res.status(201).json(await Model.create(clean(req.body)))));
  r.put('/:id', wrap(async (req, res) => res.json(await Model.findByIdAndUpdate(req.params.id, clean(req.body), { new: true, runValidators: true }))));
  r.delete('/:id', wrap(async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
  app.use('/api/' + path, r);
}
crud('categories', Category);
crud('suppliers', Supplier);
crud('products', Product, {
  populate: 'category supplier',
  clean: ({ quantity, ...rest }) => rest,                       // stock can't be typed in by hand
  filter: (req) => (req.query.filter === 'low' ? { $expr: { $lte: ['$quantity', '$reorderLevel'] } } : {}),
});

/* ---------- stock in / damaged ---------- */
const stockRoute = (path, type) => app.post('/api/' + path, wrap(async (req, res) =>
  res.status(201).json(await move(type, req.body.product, req.body.quantity, req.user.id, req.body.note))));
stockRoute('stock-in', 'Stock In');
stockRoute('damaged', 'Damage');          // automatic stock-out: recording damage reduces stock

app.get('/api/transactions', wrap(async (req, res) => {
  const { type, from, to, limit = 500 } = req.query, f = {};
  if (type) f.type = type;
  if (from || to) { f.createdAt = {}; if (from) f.createdAt.$gte = new Date(from); if (to) f.createdAt.$lte = new Date(to + 'T23:59:59.999'); }
  res.json(await Transaction.find(f).sort({ createdAt: -1 }).limit(+limit).populate('product', 'name').populate('user', 'name'));
}));

/* ---------- purchase orders ---------- */
const po = express.Router();
po.get('/', wrap(async (req, res) => res.json(await PurchaseOrder.find().sort({ number: -1 }).populate('supplier', 'name').populate('items.product', 'name'))));
po.post('/', wrap(async (req, res) => {
  const items = (req.body.items || []).filter((i) => i.product && +i.quantity > 0).map((i) => ({ product: i.product, quantity: +i.quantity }));
  if (!items.length) throw fail(400, 'Add at least one product');
  const last = await PurchaseOrder.findOne().sort({ number: -1 });
  res.status(201).json(await PurchaseOrder.create({ supplier: req.body.supplier || null, items, number: (last?.number || 0) + 1 }));
}));
po.post('/:id/receive', wrap(async (req, res) => {          // receiving adds stock automatically
  const o = await PurchaseOrder.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { status: 'received', receivedAt: new Date() });
  if (!o) throw fail(400, 'Order not found or already received');
  for (const i of o.items) await move('Purchase', i.product, i.quantity, req.user.id, 'PO-' + String(o.number).padStart(4, '0'));
  res.json({ ok: true });
}));
po.delete('/:id', wrap(async (req, res) => { await PurchaseOrder.deleteOne({ _id: req.params.id, status: 'pending' }); res.json({ ok: true }); }));
app.use('/api/purchase-orders', po);

/* ---------- dashboard ---------- */
app.get('/api/dashboard', wrap(async (req, res) => {
  const low = { $expr: { $lte: ['$quantity', '$reorderLevel'] } };
  const [tot, suppliers, inStock, lowOnly, out, recent] = await Promise.all([
    Product.aggregate([{ $group: { _id: null, count: { $sum: 1 }, stock: { $sum: '$quantity' } } }]),
    Supplier.countDocuments(),
    Product.countDocuments({ $expr: { $gt: ['$quantity', '$reorderLevel'] } }),
    Product.countDocuments({ quantity: { $gt: 0 }, ...low }),
    Product.countDocuments({ quantity: 0 }),
    Transaction.find().sort({ createdAt: -1 }).limit(5).populate('product', 'name').populate('user', 'name'),
  ]);
  res.json({ products: tot[0]?.count || 0, stock: tot[0]?.stock || 0, suppliers, inStock, lowOnly, out, low: lowOnly + out, recent });
}));

/* ---------- users & settings (admin) ---------- */
const users = express.Router();
users.use(admin);
users.get('/', wrap(async (req, res) => res.json(await User.find().select('-password').sort('createdAt'))));
users.post('/', wrap(async (req, res) => {
  const { name, username, email, password, role } = req.body;
  if (!password || password.length < 6) throw fail(400, 'Password must be at least 6 characters');
  await User.create({ name, username, email: email || undefined, role: role || 'staff', password: await bcrypt.hash(password, 10) });
  res.status(201).json({ ok: true });
}));
users.put('/:id', wrap(async (req, res) => {
  const { name, username, email, role, password } = req.body, u = { name, username, role: role || 'staff' };
  if (password) u.password = await bcrypt.hash(password, 10);   // blank password = keep the old one
  if (email) u.email = email;
  await User.findByIdAndUpdate(req.params.id, email ? { $set: u } : { $set: u, $unset: { email: 1 } }, { runValidators: true });
  res.json({ ok: true });
}));
users.delete('/:id', wrap(async (req, res) => {
  if (req.params.id === req.user.id) throw fail(400, "You can't delete yourself");
  await User.findByIdAndDelete(req.params.id); res.json({ ok: true });
}));
app.use('/api/users', users);

app.get('/api/settings', wrap(async (req, res) => res.json((await Setting.findOne()) || { appName: 'Inventory Management System' })));
app.put('/api/settings', admin, wrap(async (req, res) =>
  res.json(await Setting.findOneAndUpdate({}, { appName: req.body.appName || 'Inventory Management System' }, { upsert: true, new: true }))));

/* ---------- errors + start ---------- */
app.use((err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: `That ${Object.keys(err.keyPattern || {})[0] || 'value'} is already taken` });
  const bad = err.name === 'ValidationError' || err.name === 'CastError';
  res.status(err.status || (bad ? 400 : 500)).json({ message: err.message });
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory').then(async () => {
  if (!(await User.countDocuments()))            // first run: default admin / admin123 (change it in Users)
    await User.create({ name: 'Admin', username: 'admin', password: await bcrypt.hash('admin123', 10), role: 'admin' });
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log('API running on http://localhost:' + port));
}).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
