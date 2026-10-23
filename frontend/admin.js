const $ = (selector) => document.querySelector(selector);

function message(selector, text, good = false) {
  const node = $(selector);
  node.textContent = text;
  node.className = `notice ${good ? "success" : "error"}`;
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

function showDashboard(products) {
  $("#login-panel").hidden = true;
  $("#dashboard").hidden = false;
  $("#logout").hidden = false;
  $("#products-list").innerHTML = products.map((product) => `
    <div class="row">
      <label>Name<input class="name-input" data-id="${escapeHtml(product.id)}" type="text" maxlength="120" value="${escapeHtml(product.name)}" required><div class="category">${escapeHtml(product.category)}</div></label>
      <label>Price<input class="price-input" data-id="${escapeHtml(product.id)}" type="number" min="1" step="0.01" value="${Number(product.price)}" required></label>
      <label>New image<input class="image-input" data-id="${escapeHtml(product.id)}" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <button class="small upload-image" data-id="${escapeHtml(product.id)}" type="button">Upload image</button>
    </div>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

async function loadSession() {
  const session = await api("/api/admin/session");
  if (!session.authenticated) return;
  showDashboard(await api("/api/admin/products"));
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/admin/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({password: $("#login-password").value}) });
    message("#login-message", "Logged in.", true);
    showDashboard(await api("/api/admin/products"));
  } catch (error) { message("#login-message", error.message); }
});

$("#prices-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const prices = {};
  const names = {};
  document.querySelectorAll(".price-input").forEach((input) => { prices[input.dataset.id] = Number(input.value); });
  document.querySelectorAll(".name-input").forEach((input) => { names[input.dataset.id] = input.value.trim(); });
  try {
    await api("/api/admin/names", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({names}) });
    await api("/api/admin/prices", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({prices}) });
    message("#prices-message", "Names and prices saved successfully.", true);
  } catch (error) { message("#prices-message", error.message); }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".upload-image");
  if (!button) return;
  const input = document.querySelector(`.image-input[data-id="${CSS.escape(button.dataset.id)}"]`);
  if (!input.files[0]) return message("#prices-message", "Choose an image first.");
  const form = new FormData();
  form.append("image", input.files[0]);
  button.disabled = true;
  try {
    await api(`/api/admin/products/${encodeURIComponent(button.dataset.id)}/image`, { method: "POST", body: form });
    input.value = "";
    message("#prices-message", "Image uploaded successfully.", true);
  } catch (error) { message("#prices-message", error.message); }
  button.disabled = false;
});

$("#password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const next = $("#new-password").value;
  if (next !== $("#confirm-password").value) return message("#password-message", "New passwords do not match.");
  try {
    await api("/api/admin/password", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({current_password: $("#current-password").value, new_password: next}) });
    message("#password-message", "Password changed. Keep the new password safe.", true);
    $("#password-form").reset();
  } catch (error) { message("#password-message", error.message); }
});

$("#logout").addEventListener("click", async () => { await api("/api/admin/logout", {method:"POST"}); location.reload(); });
loadSession().catch(() => {});
