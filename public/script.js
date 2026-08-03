// This file runs in the browser and handles:
// 1. Login/signup (same token pattern as the task manager app)
// 2. Showing the product catalog and letting users add to cart
// 3. Cart management (stored in the browser until checkout)
// 4. Checkout -> creates a real order on the server
// 5. Order history (your own orders, or ALL orders if you're an admin)
// 6. Admin-only: add products, update order status

let token = localStorage.getItem("token");
let userName = localStorage.getItem("userName");
let userRole = localStorage.getItem("userRole");
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let allProducts = [];

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const userInfo = document.getElementById("user-info");
const welcomeMsg = document.getElementById("welcome-msg");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showLoginBtn = document.getElementById("show-login");
const showRegisterBtn = document.getElementById("show-register");
const logoutBtn = document.getElementById("logout-btn");

// ---- Auth tab switching ----
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

// ---- Main nav tab switching ----
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.remove("hidden");
    if (btn.dataset.tab === "cart-tab") renderCart();
    if (btn.dataset.tab === "orders-tab") loadOrders();
    if (btn.dataset.tab === "admin-tab") loadAdminOrders();
  });
});

function updateView() {
  if (token) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userInfo.classList.remove("hidden");
    welcomeMsg.textContent = `Hi, ${userName} (${userRole})`;
    document.getElementById("admin-nav-btn").classList.toggle("hidden", userRole !== "admin");
    loadProducts();
    updateCartCount();
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userInfo.classList.add("hidden");
  }
}

// ---- Register ----
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const isAdmin = document.getElementById("register-admin").checked;
  const errorEl = document.getElementById("register-error");

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: isAdmin ? "admin" : "user" }),
    });
    const data = await res.json();
    if (!res.ok) return (errorEl.textContent = data.error);
    saveSession(data);
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
    saveSession(data);
  } catch (err) {
    errorEl.textContent = "Something went wrong. Try again.";
  }
});

function saveSession(data) {
  token = data.token;
  userName = data.name;
  userRole = data.role;
  localStorage.setItem("token", token);
  localStorage.setItem("userName", userName);
  localStorage.setItem("userRole", userRole);
  updateView();
}

logoutBtn.addEventListener("click", () => {
  token = null;
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  updateView();
});

// ---- Products ----
async function loadProducts() {
  const res = await fetch("/api/products");
  allProducts = await res.json();
  const grid = document.getElementById("product-grid");
  grid.innerHTML = allProducts
    .map(
      (p) => `
      <div class="product-card">
        <img src="${p.imageUrl || "https://placehold.co/300x200?text=" + encodeURIComponent(p.name)}" alt="${p.name}" />
        <div class="info">
          <h4>${p.name}</h4>
          <p>${p.description}</p>
          <p class="price">₹${p.price}</p>
          <button onclick="addToCart('${p._id}')">Add to Cart</button>
        </div>
      </div>`
    )
    .join("");
}

// ---- Cart ----
function addToCart(productId) {
  const existing = cart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ productId, quantity: 1 });
  }
  saveCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  document.getElementById("cart-count").textContent = cart.reduce((sum, i) => sum + i.quantity, 0);
}

function renderCart() {
  const container = document.getElementById("cart-items");
  if (cart.length === 0) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    document.getElementById("cart-total").textContent = "0";
    return;
  }

  let total = 0;
  container.innerHTML = cart
    .map((item) => {
      const product = allProducts.find((p) => p._id === item.productId);
      if (!product) return "";
      const lineTotal = product.price * item.quantity;
      total += lineTotal;
      return `
        <div class="cart-item">
          <div><strong>${product.name}</strong> — ₹${product.price} each</div>
          <div class="qty-controls">
            <button onclick="changeQty('${item.productId}', -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="changeQty('${item.productId}', 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart('${item.productId}')">Remove</button>
          </div>
        </div>`;
    })
    .join("");
  document.getElementById("cart-total").textContent = total.toFixed(2);
}

function changeQty(productId, delta) {
  const item = cart.find((i) => i.productId === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter((i) => i.productId !== productId);
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.productId !== productId);
  saveCart();
  renderCart();
}

// ---- Checkout ----
document.getElementById("checkout-btn").addEventListener("click", async () => {
  if (cart.length === 0) return alert("Your cart is empty.");
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items: cart }),
  });
  if (res.ok) {
    cart = [];
    saveCart();
    renderCart();
    alert("Order placed successfully!");
    document.querySelector('[data-tab="orders-tab"]').click();
  } else {
    alert("Checkout failed. Please try again.");
  }
});

// ---- Orders (user's own, or all orders if admin) ----
async function loadOrders() {
  const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
  const orders = await res.json();
  const container = document.getElementById("orders-list");

  if (orders.length === 0) {
    container.innerHTML = "<p>No orders yet.</p>";
    return;
  }

  container.innerHTML = orders
    .map(
      (o) => `
      <div class="order-card">
        <div class="order-header">
          <span>Order #${o._id.slice(-6)}</span>
          <span class="status-badge ${o.status}">${o.status}</span>
        </div>
        <ul>
          ${o.items.map((it) => `<li>${it.name} x${it.quantity} — ₹${it.price * it.quantity}</li>`).join("")}
        </ul>
        <p><strong>Total: ₹${o.total}</strong></p>
      </div>`
    )
    .join("");
}

// ---- Admin: add product ----
document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("product-name").value;
  const description = document.getElementById("product-description").value;
  const price = parseFloat(document.getElementById("product-price").value);
  const imageUrl = document.getElementById("product-image").value;
  const stock = parseInt(document.getElementById("product-stock").value) || 0;

  const res = await fetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, description, price, imageUrl, stock }),
  });

  if (res.ok) {
    document.getElementById("product-form").reset();
    loadProducts();
    alert("Product added!");
  } else {
    alert("Failed to add product (are you logged in as admin?)");
  }
});

// ---- Admin: view + update all orders ----
async function loadAdminOrders() {
  const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
  const orders = await res.json();
  const container = document.getElementById("admin-orders-list");

  if (orders.length === 0) {
    container.innerHTML = "<p>No orders yet.</p>";
    return;
  }

  container.innerHTML = orders
    .map(
      (o) => `
      <div class="order-card">
        <div class="order-header">
          <span>Order #${o._id.slice(-6)} — ${o.user ? o.user.name : "Unknown"}</span>
          <span class="status-badge ${o.status}">${o.status}</span>
        </div>
        <ul>
          ${o.items.map((it) => `<li>${it.name} x${it.quantity}</li>`).join("")}
        </ul>
        <p><strong>Total: ₹${o.total}</strong></p>
        <div class="admin-order-actions">
          <select onchange="updateOrderStatus('${o._id}', this.value)">
            <option value="placed" ${o.status === "placed" ? "selected" : ""}>Placed</option>
            <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>Shipped</option>
            <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>Delivered</option>
          </select>
        </div>
      </div>`
    )
    .join("");
}

async function updateOrderStatus(orderId, status) {
  await fetch(`/api/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  loadAdminOrders();
}

updateView();
