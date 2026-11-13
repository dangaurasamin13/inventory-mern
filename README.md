# Inventory Management System (MERN)

MongoDB + Express + React (Vite) + Node. Needs Node 18+ and MongoDB running locally (or an Atlas URL).

## Run it
```bash
# 1) API
cd server
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run dev               # http://localhost:5000

# 2) Web app (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```
Log in with `admin` / `admin123` (created on first start; change it in Settings), or use **Sign up**.

## Accounts and sessions
- **Sign up** asks for name, username, email, password and a role (Staff or Admin). Signing up also logs the person in.
- Choosing **Admin** needs the code in `ADMIN_SIGNUP_CODE` (in `server/.env`), so strangers can't make themselves admins. Leave it empty to turn admin signup off.
- Log in with username **or** email.
- The session belongs to **one browser tab**: it is kept in `sessionStorage`, so pasting `http://localhost:5173/dashboard` into another tab asks you to log in, and closing the browser ends it. (A browser's "Duplicate tab" copies the session; a pasted link does not.)
- While you are active (mouse, keyboard, scrolling) the app renews the token every few minutes. After 30 minutes without activity you are logged out (change it with `SESSION_MINUTES` in `server/.env` and `IDLE_MS` in `client/src/App.jsx`). The server also checks the token on every request, so deleted users are logged out.
- **Settings**: everyone can edit their name/email and change their password; admins also see the system name.

## How stock works (there is no Stock Out page)
- Purchase Orders -> Purchases: marking an order received ADDS stock automatically.
- Stock In: manual additions.
- Damaged / Lost: recording an entry REDUCES stock automatically (blocked if not enough stock).
- Product stock cannot be typed in by hand, so it always matches the transaction log.
- All changes go through `move()` in `server/index.js`. For any future automatic deduction (e.g. sales) call `move('Stock Out', productId, qty, userId, note)`.

## Structure
```
server/  index.js (all routes), models.js
client/src/  App.jsx (layout, login, routes), Crud.jsx (generic add/edit/delete),
             Dashboard.jsx, Purchasing.jsx, StockPages.jsx, Reports.jsx, Settings.jsx
```
