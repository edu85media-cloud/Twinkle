const SUPABASE_URL = "https://juerfukskumpwcjvkasz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Y0zrJi2dYz083Y12PxG-aA_EmLFNUNB";
const WHATSAPP_NUMBER = "96894711404";

let db;
let session = null;
let products = [];
let activeCategory = "all";
let cart = {};

try {
  cart = JSON.parse(localStorage.getItem("twinkle-cart") || "{}");
} catch {
  cart = {};
}

const $ = (id) => document.getElementById(id);
const money = (value) => `${Number(value || 0).toFixed(3)} ر.ع`;
const getProduct = (id) => products.find((p) => String(p.id) === String(id));

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 1800);
}

function showStatus(id, message, ok = true) {
  const el = $(id);
  el.textContent = message;
  el.className = `status show ${ok ? "ok" : "bad"}`;
}

function stockQty(product) {
  if (Number.isFinite(Number(product.stock_qty))) return Math.max(0, Number(product.stock_qty));
  if (Number.isFinite(Number(product.stock))) return Math.max(0, Number(product.stock));
  return product.in_stock === false ? 0 : 1;
}

function stockLabel(product) {
  const qty = stockQty(product);
  if (qty <= 0) return "⚫ نفد المخزون";
  if (qty === 1) return "🔴 آخر قطعة";
  if (qty <= 5) return "🟠 باقي عدد محدود";
  return "🟢 متوفر";
}

async function loadProducts() {
  const query = session
    ? db.from("products").select("*").order("sort_order", { ascending: false })
    : db.from("products").select("*").eq("hidden", false).order("sort_order", { ascending: false });

  const { data, error } = await query;

  if (error) {
    $("productsGrid").innerHTML = `<div class="loading">تعذر تحميل المنتجات: ${error.message}</div>`;
    return;
  }

  products = data || [];
  renderProducts();
  renderCart();
  if (session) {
    renderAdminList();
    renderDashboard();
  }
}

function renderProducts() {
  const q = ($("search").value || "").trim().toLowerCase();
  const list = products.filter((p) => {
    const visible = !p.hidden;
    const categoryOk = activeCategory === "all" || p.category === activeCategory;
    const text = `${p.name_ar || ""} ${p.name_en || ""}`.toLowerCase();
    return visible && categoryOk && text.includes(q);
  });

  $("productsGrid").innerHTML = list.length
    ? list.map((p) => {
        const qty = stockQty(p);
        return `
          <article class="product-card">
            ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
            ${p.image_url ? `<img src="${p.image_url}" alt="${p.name_ar || "منتج"}">` : `<div class="placeholder">✨</div>`}
            <div class="product-info">
              <h3>${p.name_ar || "منتج"}</h3>
              <small>${p.name_en || ""}</small>
              <div class="price">${money(p.price)}</div>
              <div class="stock">${stockLabel(p)}</div>
              <button class="add-btn" ${qty <= 0 ? "disabled" : ""} onclick="addToCart('${p.id}')">
                ${qty <= 0 ? "نفد المخزون" : "🛍️ أضيفي إلى الحقيبة"}
              </button>
            </div>
          </article>`;
      }).join("")
    : `<div class="loading">لا توجد منتجات حاليًا.</div>`;
}

function setCategory(category, button) {
  activeCategory = category;
  document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");
  renderProducts();
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product) return;

  const qty = stockQty(product);
  const current = Number(cart[id] || 0);

  if (current >= qty) {
    toast("لا يمكن طلب كمية أكبر من المتوفر");
    return;
  }

  cart[id] = current + 1;
  saveCart();
  toast("✨ تمت إضافة القطعة إلى حقيبتك");
}

function changeQty(id, delta) {
  const product = getProduct(id);
  if (!product) return;

  const next = Number(cart[id] || 0) + delta;
  if (next <= 0) {
    delete cart[id];
  } else if (next <= stockQty(product)) {
    cart[id] = next;
  } else {
    toast("وصلتِ للكمية المتوفرة");
  }
  saveCart();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
}

function saveCart() {
  localStorage.setItem("twinkle-cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const entries = Object.entries(cart).filter(([id]) => getProduct(id));
  $("cartCount").textContent = entries.reduce((sum, [, qty]) => sum + Number(qty), 0);

  if (!entries.length) {
    $("cartItems").innerHTML = "<p>حقيبتك فارغة.</p>";
    $("checkoutArea").hidden = true;
    return;
  }

  $("checkoutArea").hidden = false;
  $("cartItems").innerHTML = entries.map(([id, qty]) => {
    const p = getProduct(id);
    return `
      <div class="cart-row">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name_ar}">` : "✨"}
        <div>
          <b>${p.name_ar}</b>
          <div>${money(p.price)}</div>
          <div class="qty">
            <button onclick="changeQty('${id}',-1)">−</button>
            <b>${qty}</b>
            <button onclick="changeQty('${id}',1)">+</button>
          </div>
        </div>
        <button class="danger-small" onclick="removeFromCart('${id}')">حذف</button>
      </div>`;
  }).join("");

  const subtotal = entries.reduce((sum, [id, qty]) => {
    return sum + Number(getProduct(id).price) * Number(qty);
  }, 0);

  const shipping = Number($("shipping").value || 1);
  $("subtotal").textContent = money(subtotal);
  $("shippingCost").textContent = money(shipping);
  $("grandTotal").textContent = money(subtotal + shipping);
}

function openCart() {
  $("overlay").classList.add("open");
  $("cartDrawer").classList.add("open");
  renderCart();
}

function closeCart() {
  $("overlay").classList.remove("open");
  $("cartDrawer").classList.remove("open");
}

function sendOrder() {
  const name = $("customerName").value.trim();
  const phone = $("customerPhone").value.trim();
  const governorate = $("governorate").value;
  const address = $("address").value.trim();

  if (!name || !phone || !governorate || !address) {
    alert("أكملي البيانات المطلوبة");
    return;
  }

  const entries = Object.entries(cart).filter(([id]) => getProduct(id));
  if (!entries.length) return;

  const shipping = Number($("shipping").value || 1);
  const subtotal = entries.reduce((sum, [id, qty]) => sum + Number(getProduct(id).price) * Number(qty), 0);

  const lines = entries.map(([id, qty], index) => {
    const p = getProduct(id);
    return `${index + 1}. ${p.name_ar}\nالكمية: ${qty} × ${money(p.price)} = ${money(Number(p.price) * Number(qty))}`;
  }).join("\n\n");

  const message = `🌸 Twinkle Accessories
━━━━━━━━━━━━
👤 الاسم: ${name}
📱 الهاتف: ${phone}
📍 المحافظة: ${governorate}
🏠 العنوان: ${address}
🚚 التوصيل: ${shipping === 1 ? "مكتب" : "منزل"} — ${money(shipping)}
━━━━━━━━━━━━
🛍️ المنتجات:
${lines}
━━━━━━━━━━━━
💰 الإجمالي: ${money(subtotal + shipping)}
💝 رسالة الهدية: ${$("giftMessage").value.trim() || "لا توجد"}
📝 الملاحظات: ${$("orderNotes").value.trim() || "لا توجد"}`;

  location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function openAdmin() {
  $("adminModal").classList.add("open");
}

function closeAdmin() {
  $("adminModal").classList.remove("open");
}

async function refreshSession() {
  const { data } = await db.auth.getSession();
  session = data.session;
  $("authArea").hidden = Boolean(session);
  $("adminArea").hidden = !session;
  $("signUpBtn").hidden = new URLSearchParams(location.search).get("setup") !== "1";
  await loadProducts();
}

async function signUp() {
  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  if (!email || password.length < 8) {
    showStatus("authStatus", "اكتبي إيميلًا وكلمة مرور من 8 أحرف على الأقل", false);
    return;
  }

  const { error } = await db.auth.signUp({ email, password });
  showStatus("authStatus", error ? error.message : "تم إنشاء الحساب. أكدي الإيميل ثم سجلي الدخول.", !error);
}

async function signIn() {
  const { data, error } = await db.auth.signInWithPassword({
    email: $("adminEmail").value.trim(),
    password: $("adminPassword").value
  });

  if (error) {
    showStatus("authStatus", error.message, false);
    return;
  }

  session = data.session;
  await refreshSession();
}

async function signOut() {
  await db.auth.signOut();
  session = null;
  await refreshSession();
}

async function uploadImage(file) {
  if (!file) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await db.storage.from("product-images").upload(path, file);
  if (error) throw error;

  return db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

async function saveProduct() {
  const id = $("editId").value;
  const name_ar = $("aNameAr").value.trim();
  const name_en = $("aNameEn").value.trim();
  const price = Number($("aPrice").value);
  const category = $("aCategory").value;
  const badge = $("aBadge").value;
  const stock_qty = Math.max(0, Number($("aStock").value || 0));
  const file = $("aImage").files[0];
  const oldImage = $("oldImageUrl").value;

  if (!name_ar || !Number.isFinite(price)) {
    showStatus("adminStatus", "أضيفي اسم المنتج والسعر", false);
    return;
  }

  try {
    showStatus("adminStatus", "جاري الحفظ...");
    const image_url = file ? await uploadImage(file) : oldImage;

    const payload = {
      name_ar,
      name_en,
      price,
      category,
      badge,
      image_url,
      stock_qty,
      in_stock: stock_qty > 0,
      hidden: false,
      updated_at: new Date().toISOString()
    };

    const result = id
      ? await db.from("products").update(payload).eq("id", id)
      : await db.from("products").insert({ ...payload, sort_order: Date.now() });

    if (result.error) throw result.error;

    showStatus("adminStatus", "تم الحفظ وظهر للزبائن ✅");
    clearForm();
    await loadProducts();
  } catch (error) {
    showStatus("adminStatus", error.message || String(error), false);
  }
}

function editProduct(id) {
  const p = getProduct(id);
  if (!p) return;

  $("editId").value = p.id;
  $("oldImageUrl").value = p.image_url || "";
  $("aNameAr").value = p.name_ar || "";
  $("aNameEn").value = p.name_en || "";
  $("aPrice").value = p.price || "";
  $("aCategory").value = p.category || "necklaces";
  $("aBadge").value = p.badge || "";
  $("aStock").value = stockQty(p);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  ["editId", "oldImageUrl", "aNameAr", "aNameEn", "aPrice", "aImage"].forEach((id) => {
    $(id).value = "";
  });
  $("aCategory").value = "necklaces";
  $("aBadge").value = "";
  $("aStock").value = 1;
}

async function updateStock(id, delta) {
  const p = getProduct(id);
  const next = Math.max(0, stockQty(p) + delta);
  await db.from("products").update({
    stock_qty: next,
    in_stock: next > 0,
    updated_at: new Date().toISOString()
  }).eq("id", id);
  await loadProducts();
}

async function toggleHidden(id, hidden) {
  await db.from("products").update({ hidden }).eq("id", id);
  await loadProducts();
}

async function deleteProduct(id) {
  if (!confirm("حذف المنتج؟")) return;
  await db.from("products").delete().eq("id", id);
  await loadProducts();
}

function renderDashboard() {
  const total = products.length;
  const available = products.filter((p) => stockQty(p) > 0).length;
  const soldOut = products.filter((p) => stockQty(p) <= 0).length;
  const low = products.filter((p) => stockQty(p) > 0 && stockQty(p) <= 5).length;

  $("dashboardStats").innerHTML = `
    <div class="stat"><span>📦 المنتجات</span><b>${total}</b></div>
    <div class="stat"><span>🟢 المتوفر</span><b>${available}</b></div>
    <div class="stat"><span>⚫ نفد</span><b>${soldOut}</b></div>
    <div class="stat"><span>⚠️ منخفض</span><b>${low}</b></div>`;
}

function renderAdminList() {
  $("adminList").innerHTML = products.map((p) => `
    <div class="admin-row">
      ${p.image_url ? `<img src="${p.image_url}" alt="${p.name_ar}">` : "✨"}
      <div>
        <b>${p.name_ar}</b><br>
        <small>${money(p.price)} — المخزون: ${stockQty(p)} — ${p.hidden ? "مخفي" : "ظاهر"}</small>
      </div>
      <div class="row-actions">
        <button class="primary-small" onclick="editProduct('${p.id}')">تعديل</button>
        <button class="warn-small" onclick="updateStock('${p.id}',-1)">−</button>
        <button class="warn-small" onclick="updateStock('${p.id}',1)">+</button>
        <button class="secondary-small" onclick="toggleHidden('${p.id}',${!p.hidden})">${p.hidden ? "إظهار" : "إخفاء"}</button>
        <button class="danger-small" onclick="deleteProduct('${p.id}')">حذف</button>
      </div>
    </div>`).join("");
}

function bindEvents() {
  $("bagBtn").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("overlay").addEventListener("click", closeCart);
  $("shipping").addEventListener("change", renderCart);
  $("sendOrder").addEventListener("click", sendOrder);
  $("search").addEventListener("input", renderProducts);

  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => setCategory(button.dataset.category, button));
  });

  $("closeAdmin").addEventListener("click", closeAdmin);
  $("signInBtn").addEventListener("click", signIn);
  $("signUpBtn").addEventListener("click", signUp);
  $("signOutBtn").addEventListener("click", signOut);
  $("saveProductBtn").addEventListener("click", saveProduct);
  $("clearFormBtn").addEventListener("click", clearForm);

  let taps = 0;
  let timer;
  $("secretAdmin").addEventListener("click", () => {
    taps += 1;
    clearTimeout(timer);
    timer = setTimeout(() => { taps = 0; }, 3000);
    if (taps >= 5) {
      taps = 0;
      openAdmin();
    }
  });
}

async function start() {
  bindEvents();

  const params = new URLSearchParams(location.search);
  if (params.has("admin") || params.has("setup")) openAdmin();

  if (!window.supabase) {
    $("productsGrid").innerHTML = `<div class="loading">تعذر تحميل اتصال المتجر. حدّثي الصفحة.</div>`;
    return;
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  db.channel("twinkle-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadProducts)
    .subscribe();

  db.auth.onAuthStateChange((_event, currentSession) => {
    session = currentSession;
    refreshSession();
  });

  await refreshSession();
}

start();
