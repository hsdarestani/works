const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const PROJECT_ID = 201;
const BASELINE_DATE = "2026-07-18";
const DEFAULT_PROPERTY = "https://a-esthetic.de/";
const MAPS_MATCH_TEXT = "a+ esthetic";
const MAPS_DOMAIN = "a-esthetic.de";

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

const BASELINE = [
  ["Botox Frankfurt", "maps", 11],
  ["Masseter Frankfurt", "maps", 8],
  ["Vitamin Infusion Frankfurt", "gsc", 29],
  ["Filler Frankfurt", "gsc", 77],
  ["Fett weg Spritze Frankfurt", "gsc", 37],
  ["Fett weg Spritze Frankfurt", "maps", 12],
  ["Skinbooster Frankfurt", "maps", 14],
  ["PRP Behandlung Frankfurt", "gsc", 37],
  ["Masseter Botox Frankfurt", "maps", 12],
  ["Masseter Botox Frankfurt", "gsc", 19]
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function base64Url(input) {
  let binary = "";
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(input);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const clean = String(pem || "")
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function googleAccessToken(env) {
  if (!env.GSC_CLIENT_EMAIL || !env.GSC_PRIVATE_KEY) {
    throw new Error("Search Console credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: env.GSC_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.GSC_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Could not authenticate with Google.");
  }
  return data.access_token;
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

  for (const [keyword, source, position] of BASELINE) {
    const keywordId = ids.get(normalizeKeyword(keyword));
    if (!keywordId) continue;
    await db.prepare(`
      INSERT OR IGNORE INTO seo_rank_history
        (keyword_id, source, rank_date, checked_at, position, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      keywordId,
      source,
      BASELINE_DATE,
      `${BASELINE_DATE}T12:00:00.000Z`,
      position,
      JSON.stringify({ origin: "manual_incognito_report" })
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
    keywords: keywords.results || [],
    history: history.results || []
  };
}

async function collectGsc(db, env, keywords) {
  if (!env.GSC_CLIENT_EMAIL || !env.GSC_PRIVATE_KEY) {
    return { ok: false, skipped: true, error: "GSC credentials missing" };
  }

  const token = await googleAccessToken(env);
  const property = env.GSC_PROPERTY || DEFAULT_PROPERTY;
  const today = berlinDate();
  const startDate = dateShift(today, -10);
  const endDate = dateShift(today, -1);
  const enabled = keywords.filter(k => Number(k.gsc_enabled) === 1);
  const regex = `^(${enabled.map(k => escapeRegex(k.keyword)).join("|")})$`;
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["date", "query"],
      dimensionFilterGroups: [{
        groupType: "and",
        filters: [{ dimension: "query", operator: "includingRegex", expression: regex }]
      }],
      rowLimit: 25000,
      dataState: "final"
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Search Console request failed.");
  }

  const ids = new Map(enabled.map(k => [normalizeKeyword(k.keyword), Number(k.id)]));
  let saved = 0;
  for (const row of data.rows || []) {
    const [rankDate, query] = row.keys || [];
    const keywordId = ids.get(normalizeKeyword(query));
    if (!keywordId || !rankDate) continue;
    await db.prepare(`
      INSERT INTO seo_rank_history
        (keyword_id, source, rank_date, checked_at, position, clicks, impressions, ctr, metadata_json)
      VALUES (?, 'gsc', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(keyword_id, source, rank_date) DO UPDATE SET
        checked_at = excluded.checked_at,
        position = excluded.position,
        clicks = excluded.clicks,
        impressions = excluded.impressions,
        ctr = excluded.ctr,
        metadata_json = excluded.metadata_json
    `).bind(
      keywordId,
      rankDate,
      new Date().toISOString(),
      Number(row.position),
      Number(row.clicks || 0),
      Number(row.impressions || 0),
      Number(row.ctr || 0),
      JSON.stringify({ property, source: "search_console_api" })
    ).run();
    saved += 1;
  }

  return { ok: true, saved, start_date: startDate, end_date: endDate };
}

function mapsMatch(result, env) {
  const title = String(result?.title || "").toLocaleLowerCase("de-DE");
  const website = String(result?.website || result?.links?.website || "").toLocaleLowerCase("de-DE");
  const placeId = String(result?.place_id || result?.data_id || "");
  const expectedPlace = String(env.MAPS_PLACE_ID || "").trim();
  if (expectedPlace && placeId && placeId === expectedPlace) return true;
  if (website.includes(MAPS_DOMAIN)) return true;
  return title.includes(String(env.MAPS_MATCH_TEXT || MAPS_MATCH_TEXT).toLocaleLowerCase("de-DE"));
}

async function collectMaps(db, env, keywords) {
  if (!env.SERPAPI_KEY) {
    return { ok: false, skipped: true, error: "SERPAPI_KEY missing" };
  }

  const enabled = keywords.filter(k => Number(k.maps_enabled) === 1);
  const rankDate = berlinDate();
  let saved = 0;
  const failures = [];

  for (const keyword of enabled) {
    try {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google_maps");
      url.searchParams.set("type", "search");
      url.searchParams.set("q", keyword.keyword);
      url.searchParams.set("hl", "de");
      url.searchParams.set("ll", env.MAPS_LL || "@50.1109,8.6821,13z");
      url.searchParams.set("api_key", env.SERPAPI_KEY);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Maps request failed");

      const results = Array.isArray(data.local_results) ? data.local_results : [];
      const match = results.find(result => mapsMatch(result, env));
      const position = match?.position == null ? null : Number(match.position);
      const metadata = {
        source: "serpapi_google_maps",
        found: Boolean(match),
        title: match?.title || null,
        place_id: match?.place_id || match?.data_id || null
      };

      await db.prepare(`
        INSERT INTO seo_rank_history
          (keyword_id, source, rank_date, checked_at, position, metadata_json)
        VALUES (?, 'maps', ?, ?, ?, ?)
        ON CONFLICT(keyword_id, source, rank_date) DO UPDATE SET
          checked_at = excluded.checked_at,
          position = excluded.position,
          metadata_json = excluded.metadata_json
      `).bind(
        Number(keyword.id),
        rankDate,
        new Date().toISOString(),
        Number.isFinite(position) ? position : null,
        JSON.stringify(metadata)
      ).run();
      saved += 1;
    } catch (error) {
      failures.push({ keyword: keyword.keyword, error: error.message || String(error) });
    }
  }

  return { ok: failures.length === 0, saved, rank_date: rankDate, failures };
}

function canRead(request, env) {
  if (!env.APP_PASSWORD) return true;
  return request.headers.get("x-app-password") === env.APP_PASSWORD;
}

function canCollect(request, env) {
  const appOk = Boolean(env.APP_PASSWORD) && request.headers.get("x-app-password") === env.APP_PASSWORD;
  const cronOk = Boolean(env.RANK_CRON_SECRET) && request.headers.get("x-rank-cron-secret") === env.RANK_CRON_SECRET;
  return appOk || cronOk;
}

async function status(env) {
  return {
    gsc_configured: Boolean(env.GSC_CLIENT_EMAIL && env.GSC_PRIVATE_KEY),
    gsc_property: env.GSC_PROPERTY || DEFAULT_PROPERTY,
    maps_configured: Boolean(env.SERPAPI_KEY),
    cron_configured: Boolean(env.RANK_CRON_SECRET),
    maps_location: env.MAPS_LL || "@50.1109,8.6821,13z"
  };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "GET, POST, OPTIONS" } });
  }
  if (!env.DB) return json({ error: "D1 binding 'DB' is not configured." }, 503);

  const segments = getSegments(params);
  const first = segments[0] || "";

  try {
    await init(env.DB);

    if (request.method === "POST" && first === "collect") {
      if (!canCollect(request, env)) return json({ error: "Unauthorized" }, 401);
      const rows = await env.DB.prepare(`
        SELECT id, keyword, gsc_enabled, maps_enabled
        FROM seo_rank_keywords
        WHERE project_id = ?
        ORDER BY sort_order ASC, id ASC
      `).bind(PROJECT_ID).all();
      const keywords = rows.results || [];
      const result = { checked_at: new Date().toISOString() };
      try { result.gsc = await collectGsc(env.DB, env, keywords); }
      catch (error) { result.gsc = { ok: false, error: error.message || String(error) }; }
      try { result.maps = await collectMaps(env.DB, env, keywords); }
      catch (error) { result.maps = { ok: false, error: error.message || String(error) }; }
      const ok = Boolean(result.gsc?.ok || result.maps?.ok);
      return json({ ok, ...result }, ok ? 200 : 502);
    }

    if (!canRead(request, env)) return json({ error: "Unauthorized" }, 401);

    if (request.method === "GET" && first === "status") {
      return json(await status(env));
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
    return json({ error: error.message || "Internal server error" }, error.status || 500);
  }
}