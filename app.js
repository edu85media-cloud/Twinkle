const WHATSAPP_NUMBER = "96894711404";

let products = [];
let activeCategory = "all";
let cart = {};

try {
  cart = JSON.parse(localStorage.getItem("twinkle-cart") || "{}");
} catch {
  cart = {};
}

const $ = (id) => document.getElementById(id);

const money = (value) =>
  `${Number(value || 0).toFixed(3)} ر.ع`;

const getProduct = (id) =>
  products.find((p) => String(p.id) === String(id));

function toast(message) {
  const el = $("toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 1800);
}

function stockQty(product) {
  if (Number.isFinite(Number(product.stock_qty))) {
    return Math.max(0, Number(product.stock_qty));
  }

  if (Number.isFinite(Number(product.stock))) {
    return Math.max(0, Number(product.stock));
  }

  return product.in_stock === false || product.in_stock === 0 ? 0 : 1;
}

function stockLabel(product) {
  const qty = stockQty(product);

  if (qty <= 0) return "⚫ نفد المخزون";
  if (qty === 1) return "🔴 آخر قطعة";
  if (qty <= 5) return "🟠 باقي عدد محدود";

  return "🟢 متوفر";
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products", {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid products response");
    }

    products = data;

    renderProducts();
    renderCart();
  } catch (error) {
    console.error("Failed to load products:", error);

    const grid = $("productsGrid");

    if (grid) {
      grid.innerHTML =
        `<div class="loading">تعذر تحميل المنتجات. حدّثي الصفحة.</div>`;
    }
  }
}

function renderProducts() {
  const grid = $("productsGrid");
  if (!grid) return;

  const search = $("search");

  const q = (search?.value || "")
    .trim()
    .toLowerCase();

  const list = products.filter((p) => {
    const hidden =
      p.hidden === true ||
      p.hidden === 1 ||
      p.hidden === "1";

    const categoryOk =
      activeCategory === "all" ||
      p.category === activeCategory;

    const text =
      `${p.name_ar || ""} ${p.name_en || ""}`.toLowerCase();

    return !hidden && categoryOk && text.includes(q);
  });

  grid.innerHTML = list.length
    ? list
        .map((p) => {
          const qty = stockQty(p);

          return `
            <article class="product-card">

              ${
                p.badge
                  ? `<span class="badge">${p.badge}</span>`
                  : ""
              }

              ${
                p.image_url
                  ? `<img src="${p.image_url}" alt="${p.name_ar || "منتج"}">`
                  : `<div class="placeholder">✨</div>`
              }

              <div class="product-info">

                <h3>${p.name_ar || "منتج"}</h3>

                <small>${p.name_en || ""}</small>

                <div class="price">
                  ${money(p.price)}
                </div>

                <div class="stock">
                  ${stockLabel(p)}
                </div>

                <button
                  class="add-btn"
                  ${qty <= 0 ? "disabled" : ""}
                  onclick="addToCart('${p.id}')"
                >
                  ${
                    qty <= 0
                      ? "نفد المخزون"
                      : "🛍️ أضيفي إلى الحقيبة"
                  }
                </button>

              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="loading">لا توجد منتجات حاليًا.</div>`;
}

function setCategory(category, button) {
  activeCategory = category;

  document
    .querySelectorAll(".filter")
    .forEach((b) => b.classList.remove("active"));

  if (button) {
    button.classList.add("active");
  }

  renderProducts();
}

function addToCart(id) {
  const product = getProduct(id);

  if (!product) return;

  const available = stockQty(product);
  const current = Number(cart[id] || 0);

  if (current >= available) {
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

  const next =
    Number(cart[id] || 0) + Number(delta);

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
  localStorage.setItem(
    "twinkle-cart",
    JSON.stringify(cart)
  );

  renderCart();
}

function renderCart() {
  const count = $("cartCount");
  const items = $("cartItems");
  const checkoutArea = $("checkoutArea");

  if (!count || !items || !checkoutArea) return;

  const entries = Object.entries(cart).filter(
    ([id]) => getProduct(id)
  );

  count.textContent = entries.reduce(
    (sum, [, qty]) => sum + Number(qty),
    0
  );

  if (!entries.length) {
    items.innerHTML = "<p>حقيبتك فارغة.</p>";
    checkoutArea.hidden = true;
    return;
  }

  checkoutArea.hidden = false;

  items.innerHTML = entries
    .map(([id, qty]) => {
      const p = getProduct(id);

      return `
        <div class="cart-row">

          ${
            p.image_url
              ? `<img src="${p.image_url}" alt="${p.name_ar || "منتج"}">`
              : "✨"
          }

          <div>
            <b>${p.name_ar || "منتج"}</b>

            <div>
              ${money(p.price)}
            </div>

            <div class="qty">
              <button onclick="changeQty('${id}', -1)">
                −
              </button>

              <b>${qty}</b>

              <button onclick="changeQty('${id}', 1)">
                +
              </button>
            </div>
          </div>

          <button
            class="danger-small"
            onclick="removeFromCart('${id}')"
          >
            حذف
          </button>

        </div>
      `;
    })
    .join("");

  const subtotal = entries.reduce(
    (sum, [id, qty]) => {
      const product = getProduct(id);

      return (
        sum +
        Number(product.price) *
          Number(qty)
      );
    },
    0
  );

  const shipping =
    Number($("shipping")?.value || 1);

  if ($("subtotal")) {
    $("subtotal").textContent =
      money(subtotal);
  }

  if ($("shippingCost")) {
    $("shippingCost").textContent =
      money(shipping);
  }

  if ($("grandTotal")) {
    $("grandTotal").textContent =
      money(subtotal + shipping);
  }
}

function openCart() {
  $("overlay")?.classList.add("open");
  $("cartDrawer")?.classList.add("open");

  renderCart();
}

function closeCart() {
  $("overlay")?.classList.remove("open");
  $("cartDrawer")?.classList.remove("open");
}

function sendOrder() {
  const name =
    $("customerName")?.value.trim() || "";

  const phone =
    $("customerPhone")?.value.trim() || "";

  const governorate =
    $("governorate")?.value || "";

  const address =
    $("address")?.value.trim() || "";

  if (
    !name ||
    !phone ||
    !governorate ||
    !address
  ) {
    alert("أكملي البيانات المطلوبة");
    return;
  }

  const entries = Object.entries(cart).filter(
    ([id]) => getProduct(id)
  );

  if (!entries.length) return;

  const shipping =
    Number($("shipping")?.value || 1);

  const subtotal = entries.reduce(
    (sum, [id, qty]) => {
      const product = getProduct(id);

      return (
        sum +
        Number(product.price) *
          Number(qty)
      );
    },
    0
  );

  const lines = entries
    .map(([id, qty], index) => {
      const p = getProduct(id);

      return `${index + 1}. ${p.name_ar}
الكمية: ${qty} × ${money(p.price)} = ${money(
        Number(p.price) * Number(qty)
      )}`;
    })
    .join("\n\n");

  const giftMessage =
    $("giftMessage")?.value.trim() ||
    "لا توجد";

  const orderNotes =
    $("orderNotes")?.value.trim() ||
    "لا توجد";

  const message = `🌸 Twinkle Accessories
━━━━━━━━━━━━
👤 الاسم: ${name}
📱 الهاتف: ${phone}
📍 المحافظة: ${governorate}
🏠 العنوان: ${address}
🚚 التوصيل: ${
    shipping === 1 ? "مكتب" : "منزل"
  } — ${money(shipping)}
━━━━━━━━━━━━
🛍️ المنتجات:
${lines}
━━━━━━━━━━━━
💰 الإجمالي: ${money(subtotal + shipping)}
💝 رسالة الهدية: ${giftMessage}
📝 الملاحظات: ${orderNotes}`;

  location.href =
    `https://wa.me/${WHATSAPP_NUMBER}` +
    `?text=${encodeURIComponent(message)}`;
}

function bindEvents() {
  $("bagBtn")?.addEventListener(
    "click",
    openCart
  );

  $("closeCart")?.addEventListener(
    "click",
    closeCart
  );

  $("overlay")?.addEventListener(
    "click",
    closeCart
  );

  $("shipping")?.addEventListener(
    "change",
    renderCart
  );

  $("sendOrder")?.addEventListener(
    "click",
    sendOrder
  );

  $("search")?.addEventListener(
    "input",
    renderProducts
  );

  document
    .querySelectorAll(".filter")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          setCategory(
            button.dataset.category,
            button
          )
      );
    });
}

async function start() {
  bindEvents();
  await loadProducts();
}

start();
let secretClicks = 0;
$("secretAdmin")?.addEventListener("click", () => {
  secretClicks++;

  if (secretClicks >= 5) {
    secretClicks = 0;
    $("adminModal")?.classList.add("open");
  }

  setTimeout(() => {
    secretClicks = 0;
  }, 2000);
});
$("closeAdmin")?.addEventListener("click", () => $("adminModal")?.classList.remove("open"));
$("signInBtn")?.addEventListener("click", () => {
  const email = $("adminEmail")?.value.trim();
  const password = $("adminPassword")?.value;

  if (!email || !password) {
    $("authStatus").textContent = "أدخلي الإيميل وكلمة المرور";
    return;
  }

  $("authArea").hidden = true;
  $("adminArea").hidden = false;
});

$("signOutBtn")?.addEventListener("click", () => {
  $("adminArea").hidden = true;
  $("authArea").hidden = false;
});

$("clearFormBtn")?.addEventListener("click", () => {
  $("editId").value = "";
  $("oldImageUrl").value = "";
  $("aNameAr").value = "";
  $("aNameEn").value = "";
  $("aPrice").value = "";
  $("aCategory").value = "necklaces";
  $("aBadge").value = "";
  $("aStock").value = "1";
  $("aImage").value = "";
  $("adminStatus").textContent = "";
});
$("saveProductBtn")?.addEventListener("click", async () => {
    console.log("SAVE BUTTON CODE LOADED");
  const nameAr = $("aNameAr")?.value.trim();
  const nameEn = $("aNameEn")?.value.trim();
  const price = Number($("aPrice")?.value);
  const category = $("aCategory")?.value;
  const badge = $("aBadge")?.value || "";
  const stock = Number($("aStock")?.value || 0);
  const image = $("aImage")?.files?.[0];

  if (!nameAr || !price || !category) {
    $("adminStatus").textContent = "أدخلي اسم المنتج والسعر والقسم";
    return;
  }

  $("adminStatus").textContent = "جاري حفظ المنتج...";
    const response = await fetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name_ar: nameAr,
      name_en: nameEn,
      price: price,
      category: category,
      badge: badge,
      stock_qty: stock,
      image_url: ""
    })
  });

  const result = await response.json();
alert("خطأ الحفظ: " + JSON.stringify(result));
  if (!response.ok) {
    $("adminStatus").textContent =
      result.error || "تعذر حفظ المنتج";
    return;
  }

  $("adminStatus").textContent = "✅ تم حفظ المنتج";
  await loadProducts();
});
