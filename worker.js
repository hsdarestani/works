const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isAuthorized(request, env) {
  if (!env.APP_PASSWORD) return true;
  return request.headers.get("x-app-password") === env.APP_PASSWORD;
}

function requireDb(env) {
  if (!env.DB) {
    const error = new Error("D1 binding 'DB' is not configured.");
    error.status = 503;
    throw error;
  }
  return env.DB;
}

async function bootstrap(db) {
  const [accounts, projects, tasks, comments] = await Promise.all([
    db.prepare("SELECT * FROM accounts ORDER BY sort_order ASC, id ASC").all(),
    db.prepare("SELECT * FROM projects ORDER BY account_id ASC, sort_order ASC, id ASC").all(),
    db.prepare("SELECT * FROM tasks ORDER BY completed ASC, created_at DESC, id DESC").all(),
    db.prepare("SELECT * FROM comments ORDER BY created_at ASC, id ASC").all()
  ]);

  return {
    accounts: accounts.results || [],
    projects: projects.results || [],
    tasks: tasks.results || [],
    comments: comments.results || []
  };
}

async function createTask(db, body) {
  const projectId = Number(body?.project_id);
  const title = String(body?.title || "").trim();
  const createdBy = String(body?.created_by || "").trim() || "Unknown";

  if (!Number.isInteger(projectId) || projectId <= 0 || !title) {
    return json({ error: "project_id and title are required." }, 400);
  }
  if (title.length > 240 || createdBy.length > 80) {
    return json({ error: "Task data is too long." }, 400);
  }

  const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) return json({ error: "Project not found." }, 404);

  const createdAt = new Date().toISOString();
  const result = await db.prepare(
    "INSERT INTO tasks (project_id, title, completed, created_by, created_at) VALUES (?, ?, 0, ?, ?)"
  ).bind(projectId, title, createdBy, createdAt).run();

  return json({
    id: result.meta?.last_row_id,
    project_id: projectId,
    title,
    completed: 0,
    created_by: createdBy,
    created_at: createdAt
  }, 201);
}

async function updateTask(db, taskId, body) {
  const id = Number(taskId);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid task id." }, 400);

  const existing = await db.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "Task not found." }, 404);

  const completed = body?.completed === undefined ? Number(existing.completed) : (Number(body.completed) ? 1 : 0);
  const title = body?.title === undefined ? existing.title : String(body.title || "").trim();
  if (!title || title.length > 240) return json({ error: "Invalid task title." }, 400);

  await db.prepare("UPDATE tasks SET title = ?, completed = ? WHERE id = ?").bind(title, completed, id).run();
  return json({ ...existing, title, completed });
}

async function createComment(db, body) {
  const taskId = Number(body?.task_id);
  const parentId = body?.parent_id === null || body?.parent_id === undefined || body?.parent_id === ""
    ? null
    : Number(body.parent_id);
  const author = String(body?.author || "").trim() || "Unknown";
  const commentBody = String(body?.body || "").trim();

  if (!Number.isInteger(taskId) || taskId <= 0 || !commentBody) {
    return json({ error: "task_id and body are required." }, 400);
  }
  if (commentBody.length > 1000 || author.length > 80) {
    return json({ error: "Comment data is too long." }, 400);
  }

  const task = await db.prepare("SELECT id FROM tasks WHERE id = ?").bind(taskId).first();
  if (!task) return json({ error: "Task not found." }, 404);

  if (parentId !== null) {
    if (!Number.isInteger(parentId) || parentId <= 0) return json({ error: "Invalid parent_id." }, 400);
    const parent = await db.prepare("SELECT id, task_id FROM comments WHERE id = ?").bind(parentId).first();
    if (!parent || Number(parent.task_id) !== taskId) {
      return json({ error: "Parent comment not found for this task." }, 400);
    }
  }

  const createdAt = new Date().toISOString();
  const result = await db.prepare(
    "INSERT INTO comments (task_id, parent_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(taskId, parentId, author, commentBody, createdAt).run();

  return json({
    id: result.meta?.last_row_id,
    task_id: taskId,
    parent_id: parentId,
    author,
    body: commentBody,
    created_at: createdAt
  }, 201);
}

async function updateProject(db, projectId, body) {
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid project id." }, 400);

  const existing = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "Project not found." }, 404);

  const allowedStatuses = new Set([
    "idea", "demo", "planning", "in_progress", "review", "live", "maintenance", "paused", "done"
  ]);

  const status = body?.status === undefined ? existing.status : String(body.status);
  if (!allowedStatuses.has(status)) return json({ error: "Invalid project status." }, 400);

  let progress = body?.progress === undefined ? Number(existing.progress || 0) : Number(body.progress);
  if (!Number.isFinite(progress)) progress = Number(existing.progress || 0);
  progress = Math.min(100, Math.max(0, Math.round(progress)));

  let url = body?.url === undefined ? existing.url : body.url;
  url = url === null || String(url).trim() === "" ? null : String(url).trim();
  if (url && url.length > 500) return json({ error: "URL is too long." }, 400);
  if (url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      return json({ error: "URL must start with http:// or https://" }, 400);
    }
  }

  await db.prepare("UPDATE projects SET status = ?, progress = ?, url = ? WHERE id = ?")
    .bind(status, progress, url, id).run();

  return json({ ...existing, status, progress, url });
}

async function handleApi(request, env, pathname) {
  if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);

  const db = requireDb(env);
  const segments = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [resource, id] = segments;

  if (request.method === "GET" && resource === "bootstrap") {
    return json(await bootstrap(db));
  }

  if (request.method === "GET" && resource === "health") {
    await db.prepare("SELECT 1 AS ok").first();
    return json({ ok: true });
  }

  if (request.method === "POST" && resource === "tasks" && !id) {
    return createTask(db, await readJson(request));
  }

  if (request.method === "PATCH" && resource === "tasks" && id) {
    return updateTask(db, id, await readJson(request));
  }

  if (request.method === "POST" && resource === "comments" && !id) {
    return createComment(db, await readJson(request));
  }

  if (request.method === "PATCH" && resource === "projects" && id) {
    return updateProject(db, id, await readJson(request));
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: { allow: "GET, POST, PATCH, OPTIONS" }
      });
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url.pathname);
      } catch (error) {
        console.error(error);
        return json({ error: error.message || "Internal server error" }, error.status || 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
