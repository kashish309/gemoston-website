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
      <label>Carat (ct)<input class="carat-input" data-id="${escapeHtml(product.id)}" type="number" min="0.01" step="0.01" value="${product.carat == null ? "" : escapeHtml(product.carat)}" placeholder="Optional"></label>
      <label>New image<input class="image-input" data-id="${escapeHtml(product.id)}" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <button class="small upload-image" data-id="${escapeHtml(product.id)}" type="button">Upload image</button>
    </div>`).join("");
}

function renderCertificates(certificates) {
  $("#certificate-list").innerHTML = certificates.map((certificate) => `
    <div class="certificate-row" data-certificate-id="${escapeHtml(certificate.id)}">
      <img class="certificate-preview" data-certificate-preview src="${escapeHtml(certificate.image)}" alt="${escapeHtml(certificate.name)}">
      <img class="certificate-preview" data-certificate-document-preview src="${escapeHtml(certificate.certificate_image)}" alt="Authenticity certificate for ${escapeHtml(certificate.name)}">
      <label>Name<input class="certificate-name-input" type="text" maxlength="120" value="${escapeHtml(certificate.name)}" required></label>
      <label>Price<input class="certificate-price-input" type="number" min="0.01" max="1000000000000" step="0.01" value="${Number(certificate.price)}" required></label>
      <label>New gemstone picture<input class="certificate-image-input" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, or WebP up to 10 MB</small></label>
      <label>New certificate image<input class="certificate-document-input" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, or WebP up to 10 MB</small></label>
      <button class="small save-certificate" type="button">Save/Update</button>
    </div>`).join("");
}

async function loadCertificates() {
  const certificates = await api("/api/admin/certificates");
  renderCertificates(Array.isArray(certificates) ? certificates : []);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

async function loadSession() {
  const session = await api("/api/admin/session");
  if (!session.authenticated) return;
  showDashboard(await api("/api/admin/products"));
  await loadCertificates();
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/admin/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({password: $("#login-password").value}) });
    message("#login-message", "Logged in.", true);
    showDashboard(await api("/api/admin/products"));
    await loadCertificates();
  } catch (error) { message("#login-message", error.message); }
});

$("#prices-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const prices = {};
  const names = {};
  const carats = {};
  document.querySelectorAll(".price-input").forEach((input) => { prices[input.dataset.id] = Number(input.value); });
  document.querySelectorAll(".name-input").forEach((input) => { names[input.dataset.id] = input.value.trim(); });
  document.querySelectorAll(".carat-input").forEach((input) => { carats[input.dataset.id] = input.value.trim() === "" ? null : Number(input.value); });
  try {
    await api("/api/admin/names", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({names}) });
    await api("/api/admin/prices", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({prices}) });
    await api("/api/admin/carats", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({carats}) });
    message("#prices-message", "Names, prices and carats saved successfully.", true);
  } catch (error) { message("#prices-message", error.message); }
});

document.addEventListener("click", async (event) => {
  const certificateButton = event.target.closest(".save-certificate");
  if (certificateButton) {
    const row = certificateButton.closest(".certificate-row");
    const nameInput = row.querySelector(".certificate-name-input");
    const priceInput = row.querySelector(".certificate-price-input");
    const imageInput = row.querySelector(".certificate-image-input");
    const certificateImageInput = row.querySelector(".certificate-document-input");
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const image = imageInput.files[0];
    const certificateImage = certificateImageInput.files[0];

    if (!name || name.length > 120) return message("#certificates-message", "Name must be 1 to 120 characters.");
    if (!Number.isFinite(price) || price <= 0 || price > 1000000000000) return message("#certificates-message", "Enter a valid positive price.");
    if (image && (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 10 * 1024 * 1024)) {
      return message("#certificates-message", "Upload a JPG, PNG, or WebP image smaller than 10 MB.");
    }
    if (certificateImage && (!["image/jpeg", "image/png", "image/webp"].includes(certificateImage.type) || certificateImage.size > 10 * 1024 * 1024)) {
      return message("#certificates-message", "Upload a valid certificate image smaller than 10 MB.");
    }

    const form = new FormData();
    form.append("name", name);
    form.append("price", String(price));
    if (image) form.append("image", image);
    if (certificateImage) form.append("certificate_image", certificateImage);
    certificateButton.disabled = true;
    try {
      await api(`/api/admin/certificates/${encodeURIComponent(row.dataset.certificateId)}`, { method: "PUT", body: form });
      await loadCertificates();
      message("#certificates-message", "Certificate gemstone updated successfully.", true);
    } catch (error) {
      message("#certificates-message", error.message || "Could not update certificate gemstone.");
      certificateButton.disabled = false;
    }
    return;
  }

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

document.addEventListener("change", (event) => {
  const input = event.target.closest(".certificate-image-input, .certificate-document-input");
  if (!input || !input.files[0]) return;
  const row = input.closest(".certificate-row");
  const preview = input.classList.contains("certificate-document-input")
    ? row.querySelector("[data-certificate-document-preview]")
    : row.querySelector("[data-certificate-preview]");
  if (preview) preview.src = URL.createObjectURL(input.files[0]);
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
