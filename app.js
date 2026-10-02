const WHATSAPP_NUMBER = "96894711404";

// ==============================
// Cloudinary
// ==============================

const CLOUD_NAME = "dlp7ubhm";
const UPLOAD_PRESET = "twinkle_upload";

// ==============================
// Store state
// ==============================

let products = [];
let activeCategory = "all";
let cart = {};

try {
  cart = JSON.parse(
    localStorage.getItem("twinkle-cart") || "{}"
  );
} catch {
  cart = {};
}

const $ = (id) => document.getElementById(id);

const money = (value) =>
  `${Number(value || 0).toFixed(3)} ر.ع`;

const getProduct = (id) =>
  products.find(
    (p) => String(p.id) === String(id)
  );

// ==============================
// Toast
// ==============================

function toast(message) {
  const el = $("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 1800);
}

// ==============================
// Stock
// ==============================

function stockQty(product) {
  if (
    Number.isFinite(
      Number(product.stock_qty)
    )
  ) {
    return Math.max(
      0,
      Number(product.stock_qty)
    );
  }

  if (
    Number.isFinite(
      Number(product.stock)
    )
  ) {
    return Math.max(
      0,
      Number(product.stock)
    );
  }

  return product.in_stock === false ||
    product.in_stock === 0
    ? 0
    : 1;
}

function stockLabel(product) {
  const qty = stockQty(product);

  if (qty <= 0) {
    return "⚫ نفد المخزون";
  }

  if (qty === 1) {
    return "🔴 آخر قطعة";
  }

  if (qty <= 5) {
    return "🟠 باقي عدد محدود";
  }

  return "🟢 متوفر";
}

// ==============================
// Load products
// ==============================

async function loadProducts() {
  try {
    const response = await fetch(
      "/api/products",
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Invalid products response"
      );
    }

    products = data;

    renderProducts();
    renderCart();

    if (!$("adminArea")?.hidden) {
      renderAdminProducts();
    }
  } catch (error) {
    console.error(
      "Failed to load products:",
      error
    );

    const grid = $("productsGrid");

    if (grid) {
      grid.innerHTML =
        `<div class="loading">
          تعذر تحميل المنتجات. حدّثي الصفحة.
        </div>`;
    }
  }
}

// ==============================
// Products
// ==============================

function renderProducts() {
  const grid = $("productsGrid");

  if (!grid) return;

  const search = $("search");

  const q = (
    search?.value || ""
  )
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
      `${p.name_ar || ""} ${
        p.name_en || ""
      }`.toLowerCase();

    return (
      !hidden &&
      categoryOk &&
      text.includes(q)
    );
  });

  grid.innerHTML = list.length
    ? list
        .map((p) => {
          const qty = stockQty(p);

          return `
            <article class="product-card">

              ${
                p.badge
                  ? `<span class="badge">
                      ${p.badge}
                    </span>`
                  : ""
              }

              ${
                p.image_url
                  ? `<img
                       src="${p.image_url}"
                       alt="${
                         p.name_ar ||
                         "منتج"
                       }"
                     >`
                  : `<div class="placeholder">
                       ✨
                     </div>`
              }

              <div class="product-info">

                <h3>
                  ${p.name_ar || "منتج"}
                </h3>

                <small>
                  ${p.name_en || ""}
                </small>

                <div class="price">
                  ${money(p.price)}
                </div>

                <div class="stock">
                  ${stockLabel(p)}
                </div>

                <button
                  class="add-btn"
                  ${
                    qty <= 0
                      ? "disabled"
                      : ""
                  }
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
    : `<div class="loading">
         لا توجد منتجات حاليًا.
       </div>`;
}

function setCategory(
  category,
  button
) {
  activeCategory = category;

  document
    .querySelectorAll(".filter")
    .forEach((b) =>
      b.classList.remove("active")
    );

  if (button) {
    button.classList.add("active");
  }

  renderProducts();
}

// ==============================
// Cart
// ==============================

function addToCart(id) {
  const product = getProduct(id);

  if (!product) return;

  const available =
    stockQty(product);

  const current =
    Number(cart[id] || 0);

  if (current >= available) {
    toast(
      "لا يمكن طلب كمية أكبر من المتوفر"
    );

    return;
  }

  cart[id] = current + 1;

  saveCart();

  toast(
    "✨ تمت إضافة القطعة إلى حقيبتك"
  );
}

function changeQty(id, delta) {
  const product = getProduct(id);

  if (!product) return;

  const next =
    Number(cart[id] || 0) +
    Number(delta);

  if (next <= 0) {
    delete cart[id];
  } else if (
    next <= stockQty(product)
  ) {
    cart[id] = next;
  } else {
    toast(
      "وصلتِ للكمية المتوفرة"
    );
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
  const checkoutArea =
    $("checkoutArea");

  if (
    !count ||
    !items ||
    !checkoutArea
  ) {
    return;
  }

  const entries =
    Object.entries(cart).filter(
      ([id]) => getProduct(id)
    );

  count.textContent =
    entries.reduce(
      (sum, [, qty]) =>
        sum + Number(qty),
      0
    );

  if (!entries.length) {
    items.innerHTML =
      "<p>حقيبتك فارغة.</p>";

    checkoutArea.hidden = true;

    return;
  }

  checkoutArea.hidden = false;

  items.innerHTML =
    entries
      .map(([id, qty]) => {
        const p =
          getProduct(id);

        return `
          <div class="cart-row">

            ${
              p.image_url
                ? `<img
                     src="${p.image_url}"
                     alt="${
                       p.name_ar ||
                       "منتج"
                     }"
                   >`
                : "✨"
            }

            <div>

              <b>
                ${p.name_ar || "منتج"}
              </b>

              <div>
                ${money(p.price)}
              </div>

              <div class="qty">

                <button
                  onclick="changeQty('${id}', -1)"
                >
                  −
                </button>

                <b>${qty}</b>

                <button
                  onclick="changeQty('${id}', 1)"
                >
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

  const subtotal =
    entries.reduce(
      (sum, [id, qty]) => {
        const product =
          getProduct(id);

        return (
          sum +
          Number(product.price) *
            Number(qty)
        );
      },
      0
    );

  const shipping =
    Number(
      $("shipping")?.value || 1
    );

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
      money(
        subtotal + shipping
      );
  }
}

// ==============================
// Cart drawer
// ==============================

function openCart() {
  $("overlay")?.classList.add(
    "open"
  );

  $("cartDrawer")?.classList.add(
    "open"
  );

  renderCart();
}

function closeCart() {
  $("overlay")?.classList.remove(
    "open"
  );

  $("cartDrawer")?.classList.remove(
    "open"
  );
}

// ==============================
// WhatsApp order
// ==============================

function sendOrder() {
  const name =
    $("customerName")
      ?.value.trim() || "";

  const phone =
    $("customerPhone")
      ?.value.trim() || "";

  const governorate =
    $("governorate")?.value || "";

  const address =
    $("address")
      ?.value.trim() || "";

  if (
    !name ||
    !phone ||
    !governorate ||
    !address
  ) {
    alert(
      "أكملي البيانات المطلوبة"
    );

    return;
  }

  const entries =
    Object.entries(cart).filter(
      ([id]) => getProduct(id)
    );

  if (!entries.length) return;

  const shipping =
    Number(
      $("shipping")?.value || 1
    );

  const subtotal =
    entries.reduce(
      (sum, [id, qty]) => {
        const product =
          getProduct(id);

        return (
          sum +
          Number(product.price) *
            Number(qty)
        );
      },
      0
    );

  const lines =
    entries
      .map(
        ([id, qty], index) => {
          const p =
            getProduct(id);

          return `${index + 1}. ${
            p.name_ar
          }
الكمية: ${qty} × ${money(
            p.price
          )} = ${money(
            Number(p.price) *
              Number(qty)
          )}`;
        }
      )
      .join("\n\n");

  const giftMessage =
    $("giftMessage")
      ?.value.trim() ||
    "لا توجد";

  const orderNotes =
    $("orderNotes")
      ?.value.trim() ||
    "لا توجد";

  const message =
`🌸 Twinkle Accessories
━━━━━━━━━━━━
👤 الاسم: ${name}
📱 الهاتف: ${phone}
📍 المحافظة: ${governorate}
🏠 العنوان: ${address}
🚚 التوصيل: ${
  shipping === 1
    ? "مكتب"
    : "منزل"
} — ${money(shipping)}
━━━━━━━━━━━━
🛍️ المنتجات:
${lines}
━━━━━━━━━━━━
💰 الإجمالي: ${money(
  subtotal + shipping
)}
💝 رسالة الهدية: ${giftMessage}
📝 الملاحظات: ${orderNotes}`;

  location.href =
    `https://wa.me/${WHATSAPP_NUMBER}` +
    `?text=${encodeURIComponent(
      message
    )}`;
}

// ==============================
// Main events
// ==============================

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

// ==============================
// Admin
// ==============================

let secretClicks = 0;

$("secretAdmin")?.addEventListener(
  "click",
  () => {
    secretClicks++;

    if (secretClicks >= 5) {
      secretClicks = 0;

      $("adminModal")
        ?.classList.add("open");
    }

    setTimeout(() => {
      secretClicks = 0;
    }, 2000);
  }
);

$("closeAdmin")?.addEventListener(
  "click",
  () =>
    $("adminModal")
      ?.classList.remove("open")
);

$("signInBtn")?.addEventListener(
  "click",
  () => {
    const email =
      $("adminEmail")
        ?.value.trim();

    const password =
      $("adminPassword")
        ?.value;

    if (!email || !password) {
      if ($("authStatus")) {
        $("authStatus").textContent =
          "أدخلي الإيميل وكلمة المرور";
      }

      return;
    }

    if ($("authArea")) {
      $("authArea").hidden = true;
    }

    if ($("adminArea")) {
      $("adminArea").hidden = false;
    }

    renderAdminProducts();
  }
);

$("signOutBtn")?.addEventListener(
  "click",
  () => {
    if ($("adminArea")) {
      $("adminArea").hidden = true;
    }

    if ($("authArea")) {
      $("authArea").hidden = false;
    }
  }
);

// ==============================
// Clear admin form
// ==============================

$("clearFormBtn")?.addEventListener(
  "click",
  () => {
    if ($("editId")) {
      $("editId").value = "";
    }

    if ($("oldImageUrl")) {
      $("oldImageUrl").value = "";
    }

    if ($("aNameAr")) {
      $("aNameAr").value = "";
    }

    if ($("aNameEn")) {
      $("aNameEn").value = "";
    }

    if ($("aPrice")) {
      $("aPrice").value = "";
    }

    if ($("aCategory")) {
      $("aCategory").value =
        "necklaces";
    }

    if ($("aBadge")) {
      $("aBadge").value = "";
    }

    if ($("aStock")) {
      $("aStock").value = "1";
    }

    if ($("aImage")) {
      $("aImage").value = "";
    }

    if ($("adminStatus")) {
      $("adminStatus").textContent =
        "";
    }
  }
);

// ==============================
// Cloudinary image upload
// ==============================

async function uploadImageToCloudinary(
  image
) {
  const formData =
    new FormData();

  formData.append(
    "file",
    image
  );

  formData.append(
    "upload_preset",
    UPLOAD_PRESET
  );

  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.secure_url
  ) {
    console.error(
      "Cloudinary error:",
      result
    );

    throw new Error(
      result?.error?.message ||
        "تعذر رفع الصورة"
    );
  }

  return result.secure_url;
}

// ==============================
// Save product
// ==============================

$("saveProductBtn")?.addEventListener(
  "click",
  async () => {
    const nameAr =
      $("aNameAr")
        ?.value.trim();

    const nameEn =
      $("aNameEn")
        ?.value.trim();

    const price =
      Number(
        $("aPrice")?.value
      );

    const category =
      $("aCategory")?.value;

    const badge =
      $("aBadge")?.value || "";

    const stock =
      Number(
        $("aStock")?.value || 0
      );

    const image =
      $("aImage")
        ?.files?.[0];

    const editId =
      $("editId")?.value;

    if (
      !nameAr ||
      !price ||
      !category
    ) {
      if ($("adminStatus")) {
        $("adminStatus").textContent =
          "أدخلي اسم المنتج والسعر والقسم";
      }

      return;
    }

    try {
      if ($("adminStatus")) {
        $("adminStatus").textContent =
          "جاري حفظ المنتج...";
      }

      // إذا كان المنتج موجودًا مسبقًا
      // نحتفظ بالصورة القديمة
      let imageUrl =
        $("oldImageUrl")?.value ||
        "";

      // إذا اختيرت صورة جديدة
      // نرفعها إلى Cloudinary
      if (image) {
        if ($("adminStatus")) {
          $("adminStatus").textContent =
            "جاري رفع الصورة...";
        }

        imageUrl =
          await uploadImageToCloudinary(
            image
          );
      }

      if ($("adminStatus")) {
        $("adminStatus").textContent =
          "جاري حفظ بيانات المنتج...";
      }

      const response =
        await fetch(
          editId
            ? `/api/products/${editId}`
            : "/api/products",
          {
            method:
              editId
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              name_ar: nameAr,
              name_en: nameEn,
              price: price,
              category: category,
              badge: badge,
              stock_qty: stock,
              image_url: imageUrl
            })
          }
        );

      let result = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        console.error(
          "Product save error:",
          result
        );

        throw new Error(
          result.error ||
            "تعذر حفظ المنتج"
        );
      }

      if ($("adminStatus")) {
        $("adminStatus").textContent =
          "✅ تم حفظ المنتج";
      }

      // تنظيف النموذج
      if ($("editId")) {
        $("editId").value = "";
      }

      if ($("oldImageUrl")) {
        $("oldImageUrl").value = "";
      }

      if ($("aNameAr")) {
        $("aNameAr").value = "";
      }

      if ($("aNameEn")) {
        $("aNameEn").value = "";
      }

      if ($("aPrice")) {
        $("aPrice").value = "";
      }

      if ($("aCategory")) {
        $("aCategory").value =
          "necklaces";
      }

      if ($("aBadge")) {
        $("aBadge").value = "";
      }

      if ($("aStock")) {
        $("aStock").value = "1";
      }

      if ($("aImage")) {
        $("aImage").value = "";
      }

      await loadProducts();

      renderAdminProducts();
    } catch (error) {
      console.error(
        "Save product error:",
        error
      );

      if ($("adminStatus")) {
        $("adminStatus").textContent =
          "❌ " +
          (
            error.message ||
            "حدث خطأ أثناء الحفظ"
          );
      }
    }
  }
);

// ==============================
// Admin products list
// ==============================

function renderAdminProducts() {
  const list = $("adminList");

  if (!list) return;

  if (!products.length) {
    list.innerHTML =
      "<p>لا توجد منتجات.</p>";

    return;
  }

  list.innerHTML =
    products
      .map(
        (p) => `
          <div class="admin-product">

            ${
              p.image_url
                ? `<img
                     src="${p.image_url}"
                     alt="${
                       p.name_ar ||
                       "منتج"
                     }"
                   >`
                : ""
            }

            <b>
              ${p.name_ar || "منتج"}
            </b>

            <span>
              ${money(p.price)}
              —
              المخزون:
              ${stockQty(p)}
            </span>

            <button
              type="button"
              onclick="editAdminProduct('${p.id}')"
            >
              تعديل
            </button>

            <button
              type="button"
              onclick="deleteAdminProduct('${p.id}')"
            >
              حذف
            </button>

          </div>
        `
      )
      .join("");
}

// ==============================
// Edit product
// ==============================

function editAdminProduct(id) {
  const p =
    getProduct(id);

  if (!p) return;

  if ($("editId")) {
    $("editId").value =
      p.id;
  }

  if ($("oldImageUrl")) {
    $("oldImageUrl").value =
      p.image_url || "";
  }

  if ($("aNameAr")) {
    $("aNameAr").value =
      p.name_ar || "";
  }

  if ($("aNameEn")) {
    $("aNameEn").value =
      p.name_en || "";
  }

  if ($("aPrice")) {
    $("aPrice").value =
      p.price || "";
  }

  if ($("aCategory")) {
    $("aCategory").value =
      p.category ||
      "necklaces";
  }

  if ($("aBadge")) {
    $("aBadge").value =
      p.badge || "";
  }

  if ($("aStock")) {
    $("aStock").value =
      stockQty(p);
  }

  if ($("aImage")) {
    $("aImage").value = "";
  }

  if ($("adminStatus")) {
    $("adminStatus").textContent =
      "✏️ عدّلي البيانات ثم اضغطي حفظ المنتج";
  }
}

// ==============================
// Delete product
// ==============================

async function deleteAdminProduct(id) {
  const p =
    getProduct(id);

  if (!p) return;

  const ok =
    confirm(
      `حذف "${p.name_ar}" نهائيًا؟`
    );

  if (!ok) return;

  if ($("adminStatus")) {
    $("adminStatus").textContent =
      "جاري حذف المنتج...";
  }

  try {
    const response =
      await fetch(
        `/api/products/${id}`,
        {
          method: "DELETE"
        }
      );

    let result = {};

    try {
      result =
        await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
          "تعذر حذف المنتج"
      );
    }

    if ($("adminStatus")) {
      $("adminStatus").textContent =
        "✅ تم حذف المنتج";
    }

    await loadProducts();

    renderAdminProducts();
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    if ($("adminStatus")) {
      $("adminStatus").textContent =
        "❌ " +
        (
          error.message ||
          "تعذر حذف المنتج"
        );
    }
  }
}

// ==============================
// Start
// ==============================

async function start() {
  bindEvents();

  await loadProducts();
}

start();
