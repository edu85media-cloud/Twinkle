export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      // جلب المنتجات
      if (url.pathname === "/api/products" && request.method === "GET") {
        const { results } = await env.DB
          .prepare(
            "SELECT * FROM products WHERE hidden = 0 ORDER BY sort_order DESC"
          )
          .all();

        return Response.json(results || []);
      }

      // إضافة منتج جديد
      if (url.pathname === "/api/products" && request.method === "POST") {
        const data = await request.json();

        const nameAr = String(data.name_ar || "").trim();
        const nameEn = String(data.name_en || "").trim();
        const price = Number(data.price);
        const category = String(data.category || "").trim();
        const badge = String(data.badge || "").trim();
        const stockQty = Number(data.stock_qty || 0);
        const imageUrl = String(data.image_url || "").trim();

        if (!nameAr || !Number.isFinite(price) || price <= 0 || !category) {
          return Response.json(
            { error: "بيانات المنتج غير مكتملة" },
            { status: 400 }
          );
        }

        const id = Date.now();

        await env.DB
          .prepare(`
            INSERT INTO products
            (id, name_ar, name_en, price, category, badge, stock_qty, image_url, hidden, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
          `)
          .bind(
            id,
            nameAr,
            nameEn,
            price,
            category,
            badge,
            stockQty,
            imageUrl
          )
          .run();

        return Response.json(
          { ok: true, id },
          { status: 201 }
        );
      }
// تعديل منتج
if (url.pathname.startsWith("/api/products/") && request.method === "PUT") {
  const id = Number(url.pathname.split("/").pop());
  const data = await request.json();

  const nameAr = String(data.name_ar || "").trim();
  const nameEn = String(data.name_en || "").trim();
  const price = Number(data.price);
  const category = String(data.category || "").trim();
  const badge = String(data.badge || "").trim();
  const stockQty = Number(data.stock_qty || 0);

  if (!Number.isFinite(id) || !nameAr || !Number.isFinite(price) || price <= 0 || !category) {
    return Response.json(
      { error: "بيانات المنتج غير مكتملة" },
      { status: 400 }
    );
  }

  await env.DB
    .prepare(`
      UPDATE products
      SET name_ar = ?, name_en = ?, price = ?, category = ?,
          badge = ?, stock_qty = ?, in_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
      nameAr,
      nameEn,
      price,
      category,
      badge,
      stockQty,
      stockQty > 0 ? 1 : 0,
      id
    )
    .run();

  return Response.json({ ok: true });
}

// حذف منتج
if (url.pathname.startsWith("/api/products/") && request.method === "DELETE") {
  const id = Number(url.pathname.split("/").pop());

  if (!Number.isFinite(id)) {
    return Response.json(
      { error: "رقم المنتج غير صحيح" },
      { status: 400 }
    );
  }

  await env.DB
    .prepare("DELETE FROM products WHERE id = ?")
    .bind(id)
    .run();

  return Response.json({ ok: true });
}
      return env.ASSETS.fetch(request);
    } catch (error) {
      return Response.json(
        { error: error.message || "Server error" },
        { status: 500 }
      );
    }
  }
};
