const { Schema, model } = require('mongoose');
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });
const req = { type: String, required: true, trim: true };
const t = { timestamps: true };

module.exports = {
  User: model('User', new Schema({ name: req, username: { ...req, unique: true }, email: { type: String, trim: true, lowercase: true, unique: true, sparse: true }, password: { type: String, required: true }, role: { type: String, enum: ['admin', 'staff'], default: 'staff' } }, t)),
  Category: model('Category', new Schema({ name: req }, t)),
  Supplier: model('Supplier', new Schema({ name: req, phone: String, email: String, address: String }, t)),
  // quantity is never set by the API directly; it only changes through move() in index.js
  Product: model('Product', new Schema({
    name: req, sku: String, category: ref('Category'), supplier: ref('Supplier'),
    price: { type: Number, default: 0, min: 0 }, quantity: { type: Number, default: 0, min: 0 }, reorderLevel: { type: Number, default: 10, min: 0 },
  }, t)),
  PurchaseOrder: model('PurchaseOrder', new Schema({
    number: Number, supplier: ref('Supplier'),
    items: [{ product: ref('Product'), quantity: { type: Number, min: 1 } }],
    status: { type: String, enum: ['pending', 'received'], default: 'pending' }, receivedAt: Date,
  }, t)),
  // every stock change is logged here; 'Stock Out' is reserved for future automatic deductions
  Transaction: model('Transaction', new Schema({
    type: { type: String, enum: ['Stock In', 'Purchase', 'Damage', 'Stock Out'], required: true },
    product: ref('Product'), quantity: Number, note: String, user: ref('User'),
  }, t)),
  Setting: model('Setting', new Schema({ appName: { type: String, default: 'Inventory Management System' } })),
};
