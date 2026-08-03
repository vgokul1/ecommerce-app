# E-Commerce Web Application

A full-stack online store: product catalog, cart, checkout, order tracking,
and role-based access (Admin vs regular User).

- **Frontend:** HTML, CSS, JavaScript (`/public`)
- **Backend:** Node.js + Express (`server.js`)
- **Database:** MongoDB (products, users, orders)
- **Auth:** JWT + bcrypt (same pattern as your task manager project)
- **Roles:** "user" can browse/buy; "admin" can also add products and update order status

## How it works, in plain terms

- Anyone can browse products without logging in — like walking into a shop.
- To buy something, you need an account. Sign up, add items to your cart
  (stored in your browser), then hit Checkout — that turns your cart into
  a real **Order** saved in the database.
- Every user has a `role` field: `user` or `admin`. The signup form has a
  checkbox to register as admin (for demo/testing — in a real product this
  would be locked down, but this keeps it simple to showcase both views).
- Admins get an extra "Admin" tab to add new products and update any
  order's status (Placed → Shipped → Delivered).
- **Role-based access** happens on the backend: routes for adding/editing
  products and viewing all orders check `req.userRole === "admin"` before
  allowing the request — a regular user's token simply can't do those things,
  even if they tried to call the API directly.

## Step 1 — Reuse your existing MongoDB database

1. Log into https://cloud.mongodb.com
2. Your cluster → Connect → Drivers → copy the connection string
3. Give this project its own database name:
   ```
   mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/ecommerce?appName=Cluster0
   ```

## Step 2 — Test locally (optional)

1. Copy `.env.example` to `.env`, fill in `MONGO_URI` and `JWT_SECRET`
2. `npm install`
3. `npm start`
4. Open http://localhost:3000

## Step 3 — Push to GitHub

Create a repo (e.g. `ecommerce-app`), upload all files except `.env`.

## Step 4 — Deploy on Render

1. **New +** → **Web Service** → connect your `ecommerce-app` repo
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Instance Type: Free
5. Environment Variables:
   - `MONGO_URI` = your connection string from Step 1
   - `JWT_SECRET` = any random text

Deploy, then open the live URL.

## Step 5 — Try it out before submitting

1. Sign up once as a regular user (leave the admin checkbox unchecked) —
   add a couple of items to cart, checkout, check "My Orders"
2. Sign up again (different email) **with** the admin checkbox checked —
   go to the Admin tab, add 3-4 sample products, and try updating an
   order's status

## What to say if asked about it

- **Product catalog:** `GET /api/products` (public), `POST/PUT/DELETE` (admin-only)
- **Cart & checkout:** cart lives in the browser (localStorage) until
  checkout; `POST /api/orders` converts it into a permanent order record,
  calculating the total server-side from real product prices (not trusting
  the browser's numbers)
- **Role-based access:** JWT token carries the user's role; a
  `requireAdmin` middleware blocks non-admins from product/order-management routes
- **Order tracking:** orders have a status field (placed/shipped/delivered)
  that only admins can update; users can see their own order history update live
