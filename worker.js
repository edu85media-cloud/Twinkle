export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/products" && request.method === "GET") {
      const { results } = await env.DB
        .prepare("SELECT * FROM products WHERE hidden = 0 ORDER BY sort_order DESC")
        .all();

      return Response.json(results);
    }

    return env.ASSETS.fetch(request);
  }
};
