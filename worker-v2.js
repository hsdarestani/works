import baseWorker from "./worker.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const ACCOUNT_TYPES = new Set([
  "own_company",
  "own_product",
  "website_client",
  "app_client",
  "demo"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function authorized(request, env) {
  return !env.APP_PASSWORD || request.headers.get("x-app-password") === env.APP_PASSWORD;
}

function validHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function slugify(value) {
  return String(value || "account")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || `account-${Date.now()}`;
}

async function ensureBrooPerformance(db) {
  await db.prepare(`
    INSERT OR IGNORE INTO accounts (
      id, slug, name, name_fa, type, website_url, accent, sort_order
    ) VALUES (
      25, 'broo-performance', 'Broo Performance', 'Broo Performance',
      'website_client', 'https://broo-performance.pages.dev/', '#d85b45', 25
    )
  `).run();

  await db.prepare(`
    INSERT OR IGNORE INTO projects (
      id, account_id, title_de, title_fa, description_de, description_fa,
      kind, status, url, progress, sort_order
    ) VALUES (
      416, 25, 'Website Demo', 'دموی وب‌سایت',
      'Website-Demo für Broo Performance.', 'دموی وب‌سایت Broo Performance.',
      'demo', 'in_progress', 'https://broo-performance.pages.dev/', 20, 1
    )
  `).run();
}

async function createAccount(request, env) {
  if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 503);

  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const type = String(body?.type || "website_client").trim();
  const websiteUrl = String(body?.website_url || "").trim() || null;

  if (!name) return json({ error: "Name is required." }, 400);
  if (name.length > 160) return json({ error: "Name is too long." }, 400);
  if (!ACCOUNT_TYPES.has(type)) return json({ error: "Invalid account type." }, 400);
  if (websiteUrl && (websiteUrl.length > 500 || !validHttpUrl(websiteUrl))) {
    return json({ error: "URL must start with http:// or https://" }, 400);
  }

  const idRow = await env.DB.prepare("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM accounts").first();
  const orderRow = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM accounts").first();
  const id = Number(idRow?.next_id || Date.now());
  const sortOrder = Number(orderRow?.next_order || id);
  const slug = `${slugify(name)}-${id}`;
  const accent = type === "app_client" ? "#557fc4" : type === "demo" ? "#8a68c1" : "#d06a4f";
  const createdAt = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO accounts (
      id, slug, name, name_fa, type, website_url, accent, sort_order, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, slug, name, name, type, websiteUrl, accent, sortOrder, createdAt).run();

  return json({
    id,
    slug,
    name,
    name_fa: name,
    type,
    website_url: websiteUrl,
    accent,
    sort_order: sortOrder,
    created_at: createdAt
  }, 201);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/accounts" && request.method === "POST") {
      return createAccount(request, env);
    }

    if (url.pathname === "/api/bootstrap" && env.DB) {
      try {
        await ensureBrooPerformance(env.DB);
      } catch (error) {
        console.error("Broo seed failed", error);
      }
    }

    return baseWorker.fetch(request, env, ctx);
  }
};
