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

        const id = crypto.randomUUID();

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

      return env.ASSETS.fetch(request);
    } catch (error) {
      return Response.json(
        { error: error.message || "Server error" },
        { status: 500 }
      );
    }
  }
};
