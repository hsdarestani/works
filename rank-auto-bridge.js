(() => {
  const baseApi = api;
  const norm = value => String(value || "").trim().toLocaleLowerCase("de-DE");
  let autoCache = null;

  async function loadAuto() {
    if (autoCache) return autoCache;
    const urls = [
      `https://raw.githubusercontent.com/hsdarestani/works/main/rankings-auto.json?v=${Date.now()}`,
      `./rankings-auto.json?v=${Date.now()}`
    ];
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${url} ${response.status}`);
        autoCache = await response.json();
        window.__rankAutoData = autoCache;
        return autoCache;
      } catch (error) {
        console.warn("Ranking history source unavailable", error);
      }
    }
    return null;
  }

  function cutoffFor(days) {
    if (!days) return "0000-01-01";
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - Number(days));
    return d.toISOString().slice(0, 10);
  }

  function mergeRankings(remote, auto, days) {
    if (!remote || !auto) return remote;
    const keywordIds = new Map((remote.keywords || []).map(k => [norm(k.keyword), Number(k.id)]));
    const cutoff = cutoffFor(days);
    const merged = new Map();

    for (const snapshot of auto.snapshots || []) {
      if (snapshot.rank_date < cutoff) continue;
      for (const entry of snapshot.entries || []) {
        if (!["ok", "not_found"].includes(entry.status)) continue;
        const keywordId = keywordIds.get(norm(entry.keyword));
        if (!keywordId) continue;
        const row = {
          id: `auto:${snapshot.rank_date}:${entry.source}:${keywordId}`,
          keyword_id: keywordId,
          source: entry.source,
          rank_date: snapshot.rank_date,
          checked_at: snapshot.checked_at,
          position: entry.position == null ? null : Number(entry.position),
          clicks: null,
          impressions: null,
          ctr: null,
          metadata_json: JSON.stringify({ origin: snapshot.origin, ...(entry.metadata || {}) })
        };
        merged.set(`${keywordId}:${entry.source}:${snapshot.rank_date}`, row);
      }
    }

    for (const row of remote.history || []) {
      merged.set(`${Number(row.keyword_id)}:${row.source}:${row.rank_date}`, row);
    }

    const latestRun = [...(auto.runs || [])].sort((a, b) => String(a.checked_at).localeCompare(String(b.checked_at))).pop() || null;
    return {
      ...remote,
      history: [...merged.values()].sort((a, b) => String(a.rank_date).localeCompare(String(b.rank_date))),
      automatic: true,
      auto_run: latestRun,
      auto_generated_at: auto.generated_at || null
    };
  }

  api = async function rankAwareApi(path, opt = {}) {
    if (opt.method && String(opt.method).toUpperCase() !== "GET") return baseApi(path, opt);

    if (path === "rankings/status") {
      const [status, auto] = await Promise.all([
        baseApi(path, opt).catch(() => ({})),
        loadAuto()
      ]);
      const latestRun = auto?.runs?.length ? auto.runs[auto.runs.length - 1] : null;
      return { ...status, automatic: true, mode: "playwright_incognito", auto_run: latestRun };
    }

    if (/^rankings\/201(?:\?|$)/.test(path)) {
      const [remote, auto] = await Promise.all([baseApi(path, opt), loadAuto()]);
      const match = path.match(/[?&]days=(\d+)/);
      return mergeRankings(remote, auto, match ? Number(match[1]) : 120);
    }

    return baseApi(path, opt);
  };

  function autoStatusText() {
    const auto = window.__rankAutoData;
    const latest = auto?.runs?.length ? auto.runs[auto.runs.length - 1] : null;
    if (!latest) {
      return `<span>Automatischer Incognito-Check</span><span>täglich 06:17 · Frankfurt</span><b>Bot bereit – erster Lauf steht aus</b>`;
    }
    const blocked = Number(latest.blocked || 0);
    const errors = Number(latest.errors || 0);
    const found = Number(latest.ok || 0);
    const date = String(latest.rank_date || "").split("-").reverse().join(".");
    const health = blocked || errors ? `⚠ ${blocked} blocked · ${errors} Fehler` : `✓ ${found} Rankings gefunden`;
    return `<span>Automatischer Incognito-Check</span><span>täglich 06:17 · Frankfurt</span><b>${date} · ${health}</b>`;
  }

  const observer = new MutationObserver(() => {
    const box = document.querySelector("#rankConfig");
    if (!box || !document.querySelector("#seoRankTracker") || !window.__rankAutoData) return;
    const desired = autoStatusText();
    if (box.dataset.autoHtml === desired) return;
    box.className = "rank-config ready";
    box.innerHTML = desired;
    box.dataset.autoHtml = desired;
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
