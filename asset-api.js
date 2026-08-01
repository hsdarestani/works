const MAX_FILE_SIZE = 25 * 1024 * 1024;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function httpError(message, status = 500, code = "ASSET_ERROR") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireFiles(env) {
  if (!env.FILES) {
    throw httpError("R2 binding 'FILES' is not configured.", 503, "R2_NOT_CONFIGURED");
  }
  return env.FILES;
}

function cleanName(value, fallback = "Asset") {
  const result = String(value || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result || fallback;
}

function safeObjectFilename(filename) {
  const cleaned = String(filename || "file")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return cleaned || "file";
}

function validAssetId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function ensureAssetsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS project_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      uploaded_by TEXT NOT NULL DEFAULT 'Unknown',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_project_assets_project
    ON project_assets(project_id, created_at DESC)
  `).run();
}

export async function listAssets(db) {
  await ensureAssetsTable(db);
  const result = await db.prepare(
    "SELECT * FROM project_assets ORDER BY created_at DESC, id DESC"
  ).all();
  return result.results || [];
}

async function uploadAsset(request, env, db) {
  const files = requireFiles(env);
  const form = await request.formData();
  const projectId = validAssetId(form.get("project_id"));
  const file = form.get("file");
  const uploadedBy = cleanName(form.get("uploaded_by"), "Unknown").slice(0, 80);

  if (!projectId) return json({ error: "A valid project_id is required." }, 400);
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.size !== "number") {
    return json({ error: "A file is required." }, 400);
  }
  if (file.size <= 0) return json({ error: "The selected file is empty." }, 400);
  if (file.size > MAX_FILE_SIZE) {
    return json({ error: "The file is larger than 25 MB.", code: "FILE_TOO_LARGE" }, 413);
  }

  const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) return json({ error: "Project not found." }, 404);

  const originalName = cleanName(file.name, "file").slice(0, 240);
  const assetName = cleanName(form.get("name"), originalName).slice(0, 160);
  const contentType = cleanName(file.type, "application/octet-stream").slice(0, 160);
  const objectKey = `projects/${projectId}/${crypto.randomUUID()}-${safeObjectFilename(originalName)}`;
  const createdAt = new Date().toISOString();

  await files.put(objectKey, file, {
    httpMetadata: { contentType },
    customMetadata: {
      projectId: String(projectId),
      assetName,
      originalName,
      uploadedBy
    }
  });

  try {
    const result = await db.prepare(`
      INSERT INTO project_assets (
        project_id, name, object_key, original_name, content_type, size, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      projectId,
      assetName,
      objectKey,
      originalName,
      contentType,
      Number(file.size),
      uploadedBy,
      createdAt
    ).run();

    return json({
      id: result.meta?.last_row_id,
      project_id: projectId,
      name: assetName,
      object_key: objectKey,
      original_name: originalName,
      content_type: contentType,
      size: Number(file.size),
      uploaded_by: uploadedBy,
      created_at: createdAt
    }, 201);
  } catch (error) {
    await files.delete(objectKey).catch(() => {});
    throw error;
  }
}

async function renameAsset(request, db, assetId) {
  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name).slice(0, 160);
  if (!name) return json({ error: "Asset name is required." }, 400);

  const existing = await db.prepare("SELECT * FROM project_assets WHERE id = ?").bind(assetId).first();
  if (!existing) return json({ error: "Asset not found." }, 404);

  await db.prepare("UPDATE project_assets SET name = ? WHERE id = ?").bind(name, assetId).run();
  return json({ ...existing, name });
}

async function deleteAsset(env, db, assetId) {
  const files = requireFiles(env);
  const existing = await db.prepare("SELECT * FROM project_assets WHERE id = ?").bind(assetId).first();
  if (!existing) return json({ error: "Asset not found." }, 404);

  await files.delete(existing.object_key);
  await db.prepare("DELETE FROM project_assets WHERE id = ?").bind(assetId).run();
  return json({ ok: true, id: assetId });
}

async function downloadAsset(env, db, assetId) {
  const files = requireFiles(env);
  const asset = await db.prepare("SELECT * FROM project_assets WHERE id = ?").bind(assetId).first();
  if (!asset) return json({ error: "Asset not found." }, 404);

  const object = await files.get(asset.object_key);
  if (!object) return json({ error: "Stored file not found." }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", asset.content_type || "application/octet-stream");
  headers.set("content-length", String(asset.size || object.size || 0));
  headers.set("cache-control", "private, no-store");
  headers.set("etag", object.httpEtag);
  headers.set(
    "content-disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(asset.original_name || asset.name || "download")}`
  );

  return new Response(object.body, { headers });
}

export async function handleAssetApi(request, env, db, segments) {
  await ensureAssetsTable(db);

  const assetId = validAssetId(segments[1]);
  const action = segments[2] || "";

  if (request.method === "POST" && segments.length === 1) {
    return uploadAsset(request, env, db);
  }

  if (request.method === "GET" && assetId && action === "download") {
    return downloadAsset(env, db, assetId);
  }

  if (request.method === "PATCH" && assetId && !action) {
    return renameAsset(request, db, assetId);
  }

  if (request.method === "DELETE" && assetId && !action) {
    return deleteAsset(env, db, assetId);
  }

  return json({ error: "Asset endpoint not found." }, 404);
}

export const ASSET_MAX_FILE_SIZE = MAX_FILE_SIZE;
