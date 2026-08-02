import baseWorker from "./task-delete-worker.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function authorized(request, env) {
  return !env.APP_PASSWORD || request.headers.get("x-app-password") === env.APP_PASSWORD;
}

function isPersian(text) {
  return /[\u0600-\u06ff]/.test(String(text || ""));
}

async function ensureTaskLanguageColumns(db) {
  const info = await db.prepare("PRAGMA table_info(tasks)").all();
  const columns = new Set((info.results || []).map(row => row.name));
  if (!columns.has("title_de")) {
    await db.prepare("ALTER TABLE tasks ADD COLUMN title_de TEXT").run();
  }
  if (!columns.has("title_fa")) {
    await db.prepare("ALTER TABLE tasks ADD COLUMN title_fa TEXT").run();
  }
}

function translatedText(response) {
  return String(
    response?.translated_text ||
    response?.translation ||
    response?.result?.translated_text ||
    ""
  ).trim();
}

async function translateTask(text, env) {
  const original = String(text || "").trim();
  const sourceIsPersian = isPersian(original);
  const sourceLang = sourceIsPersian ? "fa" : "de";
  const targetLang = sourceIsPersian ? "de" : "fa";

  let translated = "";
  if (env.AI) {
    try {
      const response = await env.AI.run("@cf/meta/m2m100-1.2b", {
        text: original,
        source_lang: sourceLang,
        target_lang: targetLang
      });
      translated = translatedText(response);
    } catch (error) {
      console.error("Task translation failed", error);
    }
  }

  if (!translated) translated = original;
  return sourceIsPersian
    ? { title_fa: original, title_de: translated }
    : { title_de: original, title_fa: translated };
}

async function backfillTaskTranslations(db, env) {
  const result = await db.prepare(`
    SELECT id, title, title_de, title_fa
    FROM tasks
    WHERE title_de IS NULL OR title_de = '' OR title_fa IS NULL OR title_fa = ''
    ORDER BY id ASC
    LIMIT 30
  `).all();

  const rows = result.results || [];
  if (!rows.length) return;

  const updates = [];
  for (const row of rows) {
    const source = String(row.title || row.title_fa || row.title_de || "").trim();
    if (!source) continue;
    const translated = await translateTask(source, env);
    updates.push(
      db.prepare("UPDATE tasks SET title_de = ?, title_fa = ? WHERE id = ?")
        .bind(
          String(row.title_de || translated.title_de || source),
          String(row.title_fa || translated.title_fa || source),
          row.id
        )
    );
  }
  if (updates.length) await db.batch(updates);
}

async function createTranslatedTask(request, env) {
  if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 503);

  const body = await request.json().catch(() => null);
  const projectId = Number(body?.project_id);
  const taskTitle = String(body?.title || "").trim();
  const createdBy = String(body?.created_by || "Hossein").trim() || "Hossein";

  if (!Number.isInteger(projectId) || projectId <= 0 || !taskTitle) {
    return json({ error: "project_id and title are required." }, 400);
  }
  if (taskTitle.length > 240 || createdBy.length > 80) {
    return json({ error: "Task data is too long." }, 400);
  }

  await ensureTaskLanguageColumns(env.DB);
  const project = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) return json({ error: "Project not found." }, 404);

  const translated = await translateTask(taskTitle, env);
  const createdAt = new Date().toISOString();
  const result = await env.DB.prepare(`
    INSERT INTO tasks (
      project_id, title, title_de, title_fa, completed, created_by, created_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?)
  `).bind(
    projectId,
    taskTitle,
    translated.title_de,
    translated.title_fa,
    createdBy,
    createdAt
  ).run();

  return json({
    id: result.meta?.last_row_id,
    project_id: projectId,
    title: taskTitle,
    title_de: translated.title_de,
    title_fa: translated.title_fa,
    completed: 0,
    created_by: createdBy,
    created_at: createdAt
  }, 201);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/tasks" && request.method === "POST") {
      try {
        return await createTranslatedTask(request, env);
      } catch (error) {
        console.error(error);
        return json({ error: error.message || "Internal server error" }, 500);
      }
    }

    if (url.pathname === "/api/bootstrap" && env.DB) {
      try {
        await ensureTaskLanguageColumns(env.DB);
        await backfillTaskTranslations(env.DB, env);
      } catch (error) {
        console.error("Task translation migration failed", error);
      }
    }

    return baseWorker.fetch(request, env, ctx);
  }
};