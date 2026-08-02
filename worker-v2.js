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

function requireDb(env) {
  if (!env.DB) return null;
  return env.DB;
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

async function createAccount(request, env) {
  if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
  const db = requireDb(env);
  if (!db) return json({ error: "D1 binding 'DB' is not configured." }, 503);

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

  const idRow = await db.prepare("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM accounts").first();
  const orderRow = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM accounts").first();
  const id = Number(idRow?.next_id || Date.now());
  const sortOrder = Number(orderRow?.next_order || id);
  const slug = `${slugify(name)}-${id}`;
  const accent = type === "app_client" ? "#557fc4" : type === "demo" ? "#8a68c1" : "#d06a4f";
  const createdAt = new Date().toISOString();

  await db.prepare(`
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

async function deleteProject(request, env, projectId) {
  if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
  const db = requireDb(env);
  if (!db) return json({ error: "D1 binding 'DB' is not configured." }, 503);

  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid project id." }, 400);
  const existing = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "Project not found." }, 404);

  await db.batch([
    db.prepare("DELETE FROM comments WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)").bind(id),
    db.prepare("DELETE FROM tasks WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM project_assets WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM projects WHERE id = ?").bind(id)
  ]);

  return json({ ok: true, id });
}

async function deleteAccount(request, env, accountId) {
  if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
  const db = requireDb(env);
  if (!db) return json({ error: "D1 binding 'DB' is not configured." }, 503);

  const id = Number(accountId);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid account id." }, 400);
  const existing = await db.prepare("SELECT id FROM accounts WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "Account not found." }, 404);

  await db.batch([
    db.prepare(`
      DELETE FROM comments
      WHERE task_id IN (
        SELECT id FROM tasks
        WHERE project_id IN (SELECT id FROM projects WHERE account_id = ?)
      )
    `).bind(id),
    db.prepare("DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE account_id = ?)").bind(id),
    db.prepare("DELETE FROM project_assets WHERE project_id IN (SELECT id FROM projects WHERE account_id = ?)").bind(id),
    db.prepare("DELETE FROM projects WHERE account_id = ?").bind(id),
    db.prepare("DELETE FROM accounts WHERE id = ?").bind(id)
  ]);

  return json({ ok: true, id });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const accountMatch = url.pathname.match(/^\/api\/accounts\/(\d+)$/);
    const projectMatch = url.pathname.match(/^\/api\/projects\/(\d+)$/);

    if (url.pathname === "/api/accounts" && request.method === "POST") {
      return createAccount(request, env);
    }

    if (accountMatch && request.method === "DELETE") {
      return deleteAccount(request, env, accountMatch[1]);
    }

    if (projectMatch && request.method === "DELETE") {
      return deleteProject(request, env, projectMatch[1]);
    }

    return baseWorker.fetch(request, env, ctx);
  }
};