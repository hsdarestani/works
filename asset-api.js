const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_REPOSITORY = "hsdarestani/works";
const DEFAULT_BRANCH = "main";

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

function requireGithubToken(env) {
  if (!env.GITHUB_TOKEN) {
    throw httpError(
      "GitHub secret 'GITHUB_TOKEN' is not configured.",
      503,
      "GITHUB_TOKEN_NOT_CONFIGURED"
    );
  }
  return env.GITHUB_TOKEN;
}

function repositoryConfig(env) {
  const repository = String(env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY).trim();
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw httpError("GITHUB_REPOSITORY must use owner/repository format.", 500, "INVALID_GITHUB_REPOSITORY");
  }
  return {
    owner,
    repo,
    branch: String(env.GITHUB_BRANCH || DEFAULT_BRANCH).trim() || DEFAULT_BRANCH
  };
}

function githubHeaders(env) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${requireGithubToken(env)}`,
    "content-type": "application/json",
    "user-agent": "a-plus-works-cloudflare-worker",
    "x-github-api-version": "2022-11-28"
  };
}

function cleanName(value, fallback = "Asset") {
  const result = String(value || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result || fallback;
}

function safeFilename(filename) {
  const value = String(filename || "file").trim();
  const extensionMatch = value.match(/(\.[a-zA-Z0-9]{1,12})$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "";
  const stem = extension ? value.slice(0, -extension.length) : value;
  const cleanedStem = stem
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 90);
  return `${cleanedStem || "file"}${extension}`;
}

function encodeRepoPath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function validAssetId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function githubRequest(env, method, path, body) {
  const { owner, repo } = repositoryConfig(env);
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeRepoPath(path)}`,
    {
      method,
      headers: githubHeaders(env),
      body: body === undefined ? undefined : JSON.stringify(body)
    }
  );

  if (response.ok) return response.status === 204 ? null : response.json();

  const details = await response.json().catch(() => ({}));
  const message = details.message || `GitHub API returned ${response.status}.`;
  const code = response.status === 401 || response.status === 403
    ? "GITHUB_TOKEN_INVALID"
    : response.status === 404
      ? "GITHUB_FILE_NOT_FOUND"
      : "GITHUB_API_ERROR";
  throw httpError(message, response.status, code);
}

async function getGithubFile(env, path) {
  try {
    return await githubRequest(env, "GET", path);
  } catch (error) {
    if (error.code === "GITHUB_FILE_NOT_FOUND") return null;
    throw error;
  }
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
  requireGithubToken(env);
  const { branch } = repositoryConfig(env);
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
    return json({ error: "The file is larger than 10 MB.", code: "FILE_TOO_LARGE" }, 413);
  }

  const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) return json({ error: "Project not found." }, 404);

  const originalName = cleanName(file.name, "file").slice(0, 240);
  const assetName = cleanName(form.get("name"), originalName).slice(0, 160);
  const contentType = cleanName(file.type, "application/octet-stream").slice(0, 160);
  const uniquePart = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const objectKey = `project-assets/${projectId}/${uniquePart}-${safeFilename(originalName)}`;
  const createdAt = new Date().toISOString();
  const content = arrayBufferToBase64(await file.arrayBuffer());

  await githubRequest(env, "PUT", objectKey, {
    message: `Upload asset for project ${projectId}: ${assetName}`,
    content,
    branch
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
    const remote = await getGithubFile(env, objectKey).catch(() => null);
    if (remote?.sha) {
      await githubRequest(env, "DELETE", objectKey, {
        message: `Rollback asset upload for project ${projectId}`,
        sha: remote.sha,
        branch
      }).catch(() => {});
    }
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
  requireGithubToken(env);
  const { branch } = repositoryConfig(env);
  const existing = await db.prepare("SELECT * FROM project_assets WHERE id = ?").bind(assetId).first();
  if (!existing) return json({ error: "Asset not found." }, 404);

  const remote = await getGithubFile(env, existing.object_key);
  if (remote?.sha) {
    await githubRequest(env, "DELETE", existing.object_key, {
      message: `Delete asset from project ${existing.project_id}: ${existing.name}`,
      sha: remote.sha,
      branch
    });
  }

  await db.prepare("DELETE FROM project_assets WHERE id = ?").bind(assetId).run();
  return json({ ok: true, id: assetId });
}

async function downloadAsset(env, db, assetId) {
  const asset = await db.prepare("SELECT * FROM project_assets WHERE id = ?").bind(assetId).first();
  if (!asset) return json({ error: "Asset not found." }, 404);

  const { owner, repo, branch } = repositoryConfig(env);
  const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodeRepoPath(asset.object_key)}`;
  const remote = await fetch(rawUrl, { headers: { "user-agent": "a-plus-works-cloudflare-worker" } });
  if (!remote.ok || !remote.body) return json({ error: "Stored file not found." }, 404);

  const headers = new Headers();
  headers.set("content-type", asset.content_type || remote.headers.get("content-type") || "application/octet-stream");
  headers.set("content-length", String(asset.size || remote.headers.get("content-length") || 0));
  headers.set("cache-control", "private, no-store");
  headers.set(
    "content-disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(asset.original_name || asset.name || "download")}`
  );

  return new Response(remote.body, { headers });
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
