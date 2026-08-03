// server.js — the backend brain of the app.
// It does 4 jobs:
// 1. Lets people sign up / log in (authentication)
// 2. Protects task routes so only logged-in users can use them (authorization)
// 3. Provides Create/Read/Update/Delete (CRUD) routes for tasks
// 4. Pushes real-time updates to the browser using Socket.io

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

app.use(express.json());
app.use(express.static("public"));

// ---- Connect to MongoDB ----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

// ---- Data models ----

// A User has a name, email, and a hashed (scrambled) password — never stored as plain text
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

// A Task belongs to one user (owner), has a title, status, etc.
const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, default: "pending" }, // pending, in-progress, done
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});
const Task = mongoose.model("Task", taskSchema);

// ---- Auth middleware ----
// This function runs before any protected route. It checks the request
// has a valid login token, and figures out WHICH user is making the request.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ---- Auth routes ----

// Sign up
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log in
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Task routes (all protected — must be logged in) ----

// Get all tasks belonging to the logged-in user
app.get("/api/tasks", requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a task
app.post("/api/tasks", requireAuth, async (req, res) => {
  try {
    const task = new Task({ ...req.body, owner: req.userId });
    await task.save();
    io.emit("tasksUpdated"); // tell all connected browsers something changed
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a task (e.g. change status or edit title)
app.put("/api/tasks/:id", requireAuth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      req.body,
      { new: true }
    );
    io.emit("tasksUpdated");
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    io.emit("tasksUpdated");
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Real-time connection ----
io.on("connection", (socket) => {
  console.log("A browser connected for real-time updates");
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
