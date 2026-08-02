import baseWorker from "./worker-v2.js";

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

async function deleteTask(request, env, taskId) {
  if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 503);

  const id = Number(taskId);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid task id." }, 400);

  const existing = await env.DB.prepare("SELECT id FROM tasks WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "Task not found." }, 404);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM comments WHERE task_id = ?").bind(id),
    env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id)
  ]);

  return json({ ok: true, id });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const taskMatch = url.pathname.match(/^\/api\/tasks\/(\d+)$/);

    if (taskMatch && request.method === "DELETE") {
      try {
        return await deleteTask(request, env, taskMatch[1]);
      } catch (error) {
        console.error(error);
        return json({ error: error.message || "Internal server error" }, 500);
      }
    }

    return baseWorker.fetch(request, env, ctx);
  }
};