// This file runs in the browser. It handles:
// 1. Login / Signup (and saving the login token)
// 2. Loading and displaying tasks
// 3. Creating, updating (moving between columns), and deleting tasks
// 4. Listening for real-time updates from the server via Socket.io

let token = localStorage.getItem("token");
let userName = localStorage.getItem("userName");

const authSection = document.getElementById("auth-section");
const taskSection = document.getElementById("task-section");
const userInfo = document.getElementById("user-info");
const welcomeMsg = document.getElementById("welcome-msg");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showLoginBtn = document.getElementById("show-login");
const showRegisterBtn = document.getElementById("show-register");
const logoutBtn = document.getElementById("logout-btn");
const taskForm = document.getElementById("task-form");

// ---- Tab switching between Login and Sign Up ----
showLoginBtn.addEventListener("click", () => {
  showLoginBtn.classList.add("active");
  showRegisterBtn.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});
showRegisterBtn.addEventListener("click", () => {
  showRegisterBtn.classList.add("active");
  showLoginBtn.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

// ---- Show the right screen depending on login state ----
function updateView() {
  if (token) {
    authSection.classList.add("hidden");
    taskSection.classList.remove("hidden");
    userInfo.classList.remove("hidden");
    welcomeMsg.textContent = `Hi, ${userName}`;
    loadTasks();
  } else {
    authSection.classList.remove("hidden");
    taskSection.classList.add("hidden");
    userInfo.classList.add("hidden");
  }
}

// ---- Register ----
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const errorEl = document.getElementById("register-error");

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return (errorEl.textContent = data.error);

    token = data.token;
    userName = data.name;
    localStorage.setItem("token", token);
    localStorage.setItem("userName", userName);
    updateView();
  } catch (err) {
    errorEl.textContent = "Something went wrong. Try again.";
  }
});

// ---- Login ----
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return (errorEl.textContent = data.error);

    token = data.token;
    userName = data.name;
    localStorage.setItem("token", token);
    localStorage.setItem("userName", userName);
    updateView();
  } catch (err) {
    errorEl.textContent = "Something went wrong. Try again.";
  }
});

// ---- Logout ----
logoutBtn.addEventListener("click", () => {
  token = null;
  userName = null;
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  updateView();
});

// ---- Load tasks from the server ----
async function loadTasks() {
  try {
    const res = await fetch("/api/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    console.error(err);
  }
}

// ---- Render tasks into their 3 columns ----
function renderTasks(tasks) {
  const columns = {
    pending: document.getElementById("pending-list"),
    "in-progress": document.getElementById("inprogress-list"),
    done: document.getElementById("done-list"),
  };
  Object.values(columns).forEach((col) => (col.innerHTML = ""));

  tasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";

    const nextStatus = { pending: "in-progress", "in-progress": "done", done: "pending" };
    const nextLabel = { pending: "Start", "in-progress": "Complete", done: "Reopen" };

    card.innerHTML = `
      <h4>${task.title}</h4>
      <p>${task.description || ""}</p>
      <div class="task-actions">
        <button class="move-btn" onclick="moveTask('${task._id}','${nextStatus[task.status]}')">
          ${nextLabel[task.status]}
        </button>
        <button class="delete-btn" onclick="deleteTask('${task._id}')">Delete</button>
      </div>
    `;
    columns[task.status].appendChild(card);
  });
}

// ---- Add a task ----
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("task-title").value;
  const description = document.getElementById("task-description").value;

  await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, status: "pending" }),
  });
  taskForm.reset();
  loadTasks();
});

// ---- Move a task to the next status ----
async function moveTask(id, newStatus) {
  await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: newStatus }),
  });
  loadTasks();
}

// ---- Delete a task ----
async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  loadTasks();
}

// ---- Real-time updates: if another tab/device changes a task, refresh ----
const socket = io();
socket.on("tasksUpdated", () => {
  if (token) loadTasks();
});

updateView();
