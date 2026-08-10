const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const PROJECT_ID = 201;
const BASELINE_DATE = "2026-07-18";
const CURRENT_DATE = "2026-08-10";

const KEYWORDS = [
  "Botox Frankfurt",
  "Masseter Frankfurt",
  "Vitamin Infusion Frankfurt",
  "Filler Frankfurt",
  "Fett weg Spritze Frankfurt",
  "Skinbooster Frankfurt",
  "Haarentfernung Frankfurt",
  "Dauerhafte Haarentfernung Frankfurt",
  "PRP Behandlung Frankfurt",
  "Masseter Botox Frankfurt"
];

const SEED = [
  [BASELINE_DATE, "Botox Frankfurt", "maps", 11],
  [BASELINE_DATE, "Masseter Frankfurt", "maps", 8],
  [BASELINE_DATE, "Vitamin Infusion Frankfurt", "gsc", 29],
  [BASELINE_DATE, "Filler Frankfurt", "gsc", 77],
  [BASELINE_DATE, "Fett weg Spritze Frankfurt", "gsc", 37],
  [BASELINE_DATE, "Fett weg Spritze Frankfurt", "maps", 12],
  [BASELINE_DATE, "Skinbooster Frankfurt", "maps", 14],
  [BASELINE_DATE, "Haarentfernung Frankfurt", "gsc", null],
  [BASELINE_DATE, "Haarentfernung Frankfurt", "maps", null],
  [BASELINE_DATE, "Dauerhafte Haarentfernung Frankfurt", "gsc", null],
  [BASELINE_DATE, "Dauerhafte Haarentfernung Frankfurt", "maps", null],
  [BASELINE_DATE, "PRP Behandlung Frankfurt", "gsc", 37],
  [BASELINE_DATE, "Masseter Botox Frankfurt", "maps", 12],
  [BASELINE_DATE, "Masseter Botox Frankfurt", "gsc", 19],

  [CURRENT_DATE, "Botox Frankfurt", "maps", 16],
  [CURRENT_DATE, "Botox Frankfurt", "gsc", 19],
  [CURRENT_DATE, "Masseter Frankfurt", "maps", 17],
  [CURRENT_DATE, "Masseter Frankfurt", "gsc", 7],
  [CURRENT_DATE, "Vitamin Infusion Frankfurt", "gsc", 11],
  [CURRENT_DATE, "Filler Frankfurt", "gsc", 59],
  [CURRENT_DATE, "Fett weg Spritze Frankfurt", "gsc", 24],
  [CURRENT_DATE, "Fett weg Spritze Frankfurt", "maps", 19],
  [CURRENT_DATE, "Skinbooster Frankfurt", "maps", 18],
  [CURRENT_DATE, "Skinbooster Frankfurt", "gsc", 19],
  [CURRENT_DATE, "Haarentfernung Frankfurt", "gsc", null],
  [CURRENT_DATE, "Haarentfernung Frankfurt", "maps", null],
  [CURRENT_DATE, "Dauerhafte Haarentfernung Frankfurt", "gsc", null],
  [CURRENT_DATE, "Dauerhafte Haarentfernung Frankfurt", "maps", null],
  [CURRENT_DATE, "PRP Behandlung Frankfurt", "gsc", 22],
  [CURRENT_DATE, "Masseter Botox Frankfurt", "maps", 24],
  [CURRENT_DATE, "Masseter Botox Frankfurt", "gsc", 15]
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function getSegments(params) {
  const raw = params?.path;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (!raw) return [];
  return String(raw).split("/").filter(Boolean);
}

function normalizeKeyword(value) {
  return String(value || "").trim().toLocaleLowerCase("de-DE");
}

function berlinDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const pick = type => parts.find(p => p.type === type)?.value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function dateShift(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS seo_rank_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      keyword_norm TEXT NOT NULL,
      gsc_enabled INTEGER NOT NULL DEFAULT 1 CHECK (gsc_enabled IN (0,1)),
      maps_enabled INTEGER NOT NULL DEFAULT 1 CHECK (maps_enabled IN (0,1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, keyword_norm)
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS seo_rank_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('gsc','maps')),
      rank_date TEXT NOT NULL,
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      position REAL,
      clicks REAL,
      impressions REAL,
      ctr REAL,
      metadata_json TEXT,
      FOREIGN KEY (keyword_id) REFERENCES seo_rank_keywords(id) ON DELETE CASCADE,
      UNIQUE(keyword_id, source, rank_date)
    )
  `).run();

  await db.prepare("CREATE INDEX IF NOT EXISTS idx_seo_rank_keywords_project ON seo_rank_keywords(project_id, sort_order, id)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_seo_rank_history_lookup ON seo_rank_history(keyword_id, source, rank_date)").run();
}

async function ensureSeed(db) {
  for (let i = 0; i < KEYWORDS.length; i += 1) {
    const keyword = KEYWORDS[i];
    await db.prepare(`
      INSERT OR IGNORE INTO seo_rank_keywords
        (project_id, keyword, keyword_norm, gsc_enabled, maps_enabled, sort_order)
      VALUES (?, ?, ?, 1, 1, ?)
    `).bind(PROJECT_ID, keyword, normalizeKeyword(keyword), i + 1).run();
  }

  const rows = await db.prepare("SELECT id, keyword_norm FROM seo_rank_keywords WHERE project_id = ?")
    .bind(PROJECT_ID).all();
  const ids = new Map((rows.results || []).map(row => [row.keyword_norm, Number(row.id)]));

  for (const [rankDate, keyword, source, position] of SEED) {
    const keywordId = ids.get(normalizeKeyword(keyword));
    if (!keywordId) continue;
    await db.prepare(`
      INSERT OR IGNORE INTO seo_rank_history
        (keyword_id, source, rank_date, checked_at, position, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      keywordId,
      source,
      rankDate,
      `${rankDate}T12:00:00.000Z`,
      position,
      JSON.stringify({ origin: "manual_public_google_check" })
    ).run();
  }
}

async function init(db) {
  await ensureSchema(db);
  await ensureSeed(db);
}

async function rankingData(db, projectId, days) {
  const cutoff = days > 0 ? dateShift(berlinDate(), -days) : "0000-01-01";
  const keywords = await db.prepare(`
    SELECT id, project_id, keyword, gsc_enabled, maps_enabled, sort_order
    FROM seo_rank_keywords
    WHERE project_id = ?
    ORDER BY sort_order ASC, id ASC
  `).bind(projectId).all();

  const history = await db.prepare(`
    SELECT h.id, h.keyword_id, h.source, h.rank_date, h.checked_at,
           h.position, h.clicks, h.impressions, h.ctr, h.metadata_json
    FROM seo_rank_history h
    JOIN seo_rank_keywords k ON k.id = h.keyword_id
    WHERE k.project_id = ? AND h.rank_date >= ?
    ORDER BY h.rank_date ASC, h.id ASC
  `).bind(projectId, cutoff).all();

  return {
    project_id: projectId,
    baseline_date: BASELINE_DATE,
    today: berlinDate(),
    mode: "manual_public_check",
    keywords: keywords.results || [],
    history: history.results || []
  };
}

function isAuthorized(request, env) {
  if (!env.APP_PASSWORD) return true;
  return request.headers.get("x-app-password") === env.APP_PASSWORD;
}

function parsePosition(value) {
  if (value === null || value === undefined || value === "" || String(value).toUpperCase() === "NA") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1000) throw new Error("Position must be a number between 1 and 1000, or NA.");
  return n;
}

async function saveManual(db, body) {
  const rankDate = String(body?.rank_date || berlinDate());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rankDate)) return json({ error: "Invalid rank_date." }, 400);
  const entries = Array.isArray(body?.entries) ? body.entries : [];
  if (!entries.length) return json({ error: "No ranking entries supplied." }, 400);

  const allowed = await db.prepare("SELECT id FROM seo_rank_keywords WHERE project_id = ?").bind(PROJECT_ID).all();
  const allowedIds = new Set((allowed.results || []).map(row => Number(row.id)));
  let saved = 0;

  for (const entry of entries) {
    const keywordId = Number(entry.keyword_id);
    const source = String(entry.source || "");
    if (!allowedIds.has(keywordId) || !["gsc", "maps"].includes(source)) continue;
    let position;
    try { position = parsePosition(entry.position); }
    catch (error) { return json({ error: error.message }, 400); }

    await db.prepare(`
      INSERT INTO seo_rank_history
        (keyword_id, source, rank_date, checked_at, position, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(keyword_id, source, rank_date) DO UPDATE SET
        checked_at = excluded.checked_at,
        position = excluded.position,
        metadata_json = excluded.metadata_json
    `).bind(
      keywordId,
      source,
      rankDate,
      new Date().toISOString(),
      position,
      JSON.stringify({ origin: "manual_public_google_check" })
    ).run();
    saved += 1;
  }

  return json({ ok: true, saved, rank_date: rankDate });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "GET, POST, OPTIONS" } });
  }
  if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 503);
  if (!isAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);

  const segments = getSegments(params);
  const first = segments[0] || "";

  try {
    await init(env.DB);

    if (request.method === "GET" && first === "status") {
      return json({
        mode: "manual_public_check",
        automatic: false,
        note: "Rankings are entered from manual public Google checks; no external API is required."
      });
    }

    if (request.method === "POST" && first === "manual") {
      const body = await request.json().catch(() => null);
      return saveManual(env.DB, body);
    }

    if (request.method === "GET") {
      const projectId = Number(first || PROJECT_ID);
      if (!Number.isInteger(projectId) || projectId <= 0) return json({ error: "Invalid project id." }, 400);
      const url = new URL(request.url);
      const daysRaw = Number(url.searchParams.get("days") || 120);
      const days = Number.isFinite(daysRaw) ? Math.min(2000, Math.max(0, Math.round(daysRaw))) : 120;
      return json(await rankingData(env.DB, projectId, days));
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: error.message || "Internal server error" }, 500);
  }
}