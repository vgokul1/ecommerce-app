# Task Management Application

A full-stack task manager with login/signup, task creation and tracking, and
real-time updates.

- **Frontend:** HTML, CSS, JavaScript (`/public`)
- **Backend:** Node.js + Express (`server.js`)
- **Database:** MongoDB (stores users and tasks)
- **Auth:** JWT tokens + bcrypt password hashing
- **Real-time:** Socket.io (when a task changes, all open tabs refresh automatically)

## How it works, in plain terms

- Users sign up / log in. Passwords are never stored as plain text — they're
  scrambled ("hashed") with bcrypt.
- After logging in, the browser gets a **token** (like a temporary ID card)
  and stores it. Every request to view/add/edit tasks includes this token,
  so the server always knows which user is asking.
- Tasks are stored in MongoDB, each linked to the user who created it —
  so users only ever see their own tasks.
- Socket.io keeps a live connection open so if a task changes (e.g. on your
  phone), it updates instantly on any other open tab too.

## Step 1 — Reuse your existing MongoDB database

You already created a MongoDB Atlas cluster for the portfolio project — you
can reuse the same one:

1. Log into https://cloud.mongodb.com
2. Go to your cluster → Connect → Drivers → copy your connection string again
   (same format as before: `mongodb+srv://username:password@cluster0...`)
3. Add `/taskmanager` before the `?` to give this project its own database name:
   ```
   mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/taskmanager?appName=Cluster0
   ```

(No need to redo Network Access — "Allow from Anywhere" is already set from last time.)

## Step 2 — Test locally (optional)

1. Copy `.env.example` to `.env` and fill in:
   ```
   MONGO_URI=your_connection_string_here
   JWT_SECRET=pick_any_random_text_like_a_password
   PORT=3000
   ```
2. Run:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000, sign up, and try adding a task.

## Step 3 — Push to GitHub

1. Create a new repository (e.g. `task-manager`) on https://github.com
2. Upload all files from this folder (use "Add file → Upload files" if you're
   not using git commands) — skip `.env` and `node_modules`.

## Step 4 — Deploy on Render

1. Go to https://render.com (already have an account from before)
2. **New +** → **Web Service** → connect your `task-manager` repo
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Add Environment Variables:
   - `MONGO_URI` = your connection string from Step 1
   - `JWT_SECRET` = any random text (e.g. `myTaskAppSecret2026`)
5. Click **Deploy Web Service**. Wait for the live URL.

That live URL is what you submit.

## What to say if asked about it

- **Authentication:** users sign up/log in; passwords hashed with bcrypt,
  sessions handled with JWT tokens.
- **Authorization:** a middleware function checks the token on every task
  route, so users can only see/edit their own tasks.
- **CRUD:** `POST /api/tasks` (create), `GET /api/tasks` (read),
  `PUT /api/tasks/:id` (update/move between columns), `DELETE /api/tasks/:id`.
- **Real-time:** Socket.io broadcasts an event whenever a task changes, so
  connected browsers refresh automatically without reloading the page.
- **Responsive design:** CSS Grid columns stack vertically on small/mobile
  screens using a media query.
