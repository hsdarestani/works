(() => {
  const RANK_PROJECT_ID = 201;
  const state = { data: null, status: null, selected: null, loading: false, days: 120 };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));

  const fmtDate = value => {
    if (!value) return "—";
    const [y, m, d] = String(value).split("-");
    return y && m && d ? `${d}.${m}.${y}` : value;
  };

  const fmtPos = value => value == null || !Number.isFinite(Number(value)) ? "NA" : Number(value).toFixed(Number(value) % 1 ? 1 : 0);

  function ensureUi() {
    if (document.querySelector("#seoRankTracker")) return;
    const tasks = document.querySelector(".panel .tasks");
    if (!tasks) return;
    const section = document.createElement("section");
    section.id = "seoRankTracker";
    section.className = "rank-tracker soft";
    section.hidden = true;
    section.innerHTML = `
      <div class="rank-head">
        <div>
          <span class="rank-kicker">SEO MONITORING</span>
          <h3>Keyword Rankings</h3>
          <small id="rankUpdated">Startwert: 18.07.2026</small>
        </div>
        <div class="rank-actions">
          <select id="rankRange" aria-label="Zeitraum">
            <option value="30">30 Tage</option>
            <option value="90">90 Tage</option>
            <option value="120" selected>120 Tage</option>
            <option value="365">1 Jahr</option>
            <option value="0">Gesamt</option>
          </select>
          <button class="secondary" id="rankManualOpen" type="button">＋ Heutige Rankings</button>
        </div>
      </div>
      <div class="rank-config" id="rankConfig"></div>
      <div class="rank-editor" id="rankEditor" hidden>
        <div class="rank-editor-head">
          <div><b>Manuellen Check eintragen</b><small>Zahl eintragen oder <code>NA</code>. Leer = nicht geprüft.</small></div>
          <label>Datum <input id="rankDate" type="date"></label>
        </div>
        <div class="rank-editor-table-wrap">
          <table class="rank-editor-table">
            <thead><tr><th>Keyword</th><th>Organic</th><th>Orte</th><th>Prüfen</th></tr></thead>
            <tbody id="rankEditorRows"></tbody>
          </table>
        </div>
        <div class="rank-editor-actions">
          <button class="secondary" id="rankManualCancel" type="button">Abbrechen</button>
          <button class="primary" id="rankManualSave" type="button">Speichern</button>
        </div>
      </div>
      <div class="rank-metrics" id="rankMetrics"></div>
      <div class="rank-layout">
        <div class="rank-table-wrap">
          <table class="rank-table">
            <thead><tr><th>Keyword</th><th>Organic</th><th>Orte</th></tr></thead>
            <tbody id="rankRows"></tbody>
          </table>
        </div>
        <div class="rank-chart-card">
          <div class="rank-chart-title">
            <div><b id="rankChartKeyword">Keyword wählen</b><small>Organic + Google Orte</small></div>
            <span class="rank-legend"><i class="gsc"></i>Organic <i class="maps"></i>Orte</span>
          </div>
          <div class="rank-chart" id="rankChart"><div class="rank-empty">Keyword auswählen</div></div>
        </div>
      </div>
    `;
    tasks.parentNode.insertBefore(section, tasks);

    section.querySelector("#rankRange").addEventListener("change", async event => {
      state.days = Number(event.target.value);
      await loadRankings(true);
    });
    section.querySelector("#rankManualOpen").addEventListener("click", openManualEditor);
    section.querySelector("#rankManualCancel").addEventListener("click", closeManualEditor);
    section.querySelector("#rankManualSave").addEventListener("click", saveManualEditor);
  }

  function entries(keywordId, source) {
    return (state.data?.history || [])
      .filter(row => Number(row.keyword_id) === Number(keywordId) && row.source === source)
      .sort((a, b) => String(a.rank_date).localeCompare(String(b.rank_date)));
  }

  function latest(keywordId, source) {
    const rows = entries(keywordId, source);
    return rows.length ? rows[rows.length - 1] : null;
  }

  function previousWithPosition(keywordId, source) {
    const rows = entries(keywordId, source).filter(row => row.position != null && Number.isFinite(Number(row.position)));
    return rows.length > 1 ? rows[rows.length - 2] : null;
  }

  function trend(keywordId, source) {
    const current = latest(keywordId, source);
    const previous = previousWithPosition(keywordId, source);
    if (!current || current.position == null || !previous || previous.position == null) return null;
    return Number(previous.position) - Number(current.position);
  }

  function rankCell(keywordId, source) {
    const row = latest(keywordId, source);
    const delta = trend(keywordId, source);
    if (!row || row.position == null) {
      return `<span class="rank-pos na">NA</span><small>${row ? fmtDate(row.rank_date) : "—"}</small>`;
    }
    const cls = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const sign = delta > 0 ? `↑${Math.abs(delta).toFixed(delta % 1 ? 1 : 0)}` : delta < 0 ? `↓${Math.abs(delta).toFixed(delta % 1 ? 1 : 0)}` : "";
    return `<span class="rank-pos">${fmtPos(row.position)}</span><small class="${cls}">${sign || fmtDate(row.rank_date)}</small>`;
  }

  function renderMetrics() {
    const box = document.querySelector("#rankMetrics");
    if (!box || !state.data) return;
    const points = [];
    state.data.keywords.forEach(keyword => {
      ["gsc", "maps"].forEach(source => {
        const row = latest(keyword.id, source);
        if (row?.position != null && Number.isFinite(Number(row.position))) {
          points.push({ position: Number(row.position), delta: trend(keyword.id, source) });
        }
      });
    });
    const top10 = points.filter(p => p.position <= 10).length;
    const top20 = points.filter(p => p.position <= 20).length;
    const improved = points.filter(p => p.delta > 0).length;
    const dropped = points.filter(p => p.delta < 0).length;
    box.innerHTML = `
      <article><span>Top 10</span><b>${top10}</b></article>
      <article><span>Top 20</span><b>${top20}</b></article>
      <article><span>Verbessert</span><b>${improved}</b></article>
      <article><span>Gefallen</span><b>${dropped}</b></article>
    `;
  }

  function renderRows() {
    const body = document.querySelector("#rankRows");
    if (!body || !state.data) return;
    body.innerHTML = state.data.keywords.map(keyword => `
      <tr data-keyword-id="${keyword.id}" class="${Number(state.selected) === Number(keyword.id) ? "selected" : ""}">
        <td><b>${esc(keyword.keyword)}</b><small>Frankfurt</small></td>
        <td>${rankCell(keyword.id, "gsc")}</td>
        <td>${rankCell(keyword.id, "maps")}</td>
      </tr>
    `).join("");
    body.querySelectorAll("tr").forEach(row => row.addEventListener("click", () => {
      state.selected = Number(row.dataset.keywordId);
      renderRows();
      renderChart();
    }));
  }

  function svgPoint(date, position, dates, width, height, maxRank, pad) {
    const xIndex = dates.indexOf(date);
    const x = dates.length <= 1 ? width / 2 : pad.left + xIndex * ((width - pad.left - pad.right) / (dates.length - 1));
    const y = pad.top + ((Math.max(1, Math.min(maxRank, Number(position))) - 1) / Math.max(1, maxRank - 1)) * (height - pad.top - pad.bottom);
    return [x, y];
  }

  function renderChart() {
    const chart = document.querySelector("#rankChart");
    const title = document.querySelector("#rankChartKeyword");
    if (!chart || !state.data) return;
    const keyword = state.data.keywords.find(k => Number(k.id) === Number(state.selected));
    if (!keyword) {
      chart.innerHTML = '<div class="rank-empty">Keyword auswählen</div>';
      title.textContent = "Keyword wählen";
      return;
    }
    title.textContent = keyword.keyword;
    const organic = entries(keyword.id, "gsc").filter(r => r.position != null);
    const maps = entries(keyword.id, "maps").filter(r => r.position != null);
    const all = [...organic, ...maps];
    if (!all.length) {
      chart.innerHTML = '<div class="rank-empty">Noch keine Ranking-Daten</div>';
      return;
    }

    const dates = [...new Set(all.map(r => r.rank_date))].sort();
    const maxSeen = Math.max(...all.map(r => Number(r.position) || 0), 20);
    const maxRank = Math.min(200, Math.max(20, Math.ceil(maxSeen / 10) * 10));
    const width = 760, height = 260, pad = { left: 42, right: 18, top: 18, bottom: 34 };
    const yTicks = [...new Set([1, 10, 20, 50, 100, maxRank].filter(n => n <= maxRank))].sort((a, b) => a - b);
    const lines = yTicks.map(rank => {
      const [, y] = svgPoint(dates[0], rank, dates, width, height, maxRank, pad);
      return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="gridline"/><text x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${rank}</text>`;
    }).join("");

    const poly = (rows, cls) => {
      const pts = rows.map(r => svgPoint(r.rank_date, r.position, dates, width, height, maxRank, pad).join(",")).join(" ");
      const dots = rows.map(r => {
        const [x, y] = svgPoint(r.rank_date, r.position, dates, width, height, maxRank, pad);
        return `<circle cx="${x}" cy="${y}" r="4" class="${cls}"><title>${fmtDate(r.rank_date)} · ${fmtPos(r.position)}</title></circle>`;
      }).join("");
      return `${rows.length > 1 ? `<polyline points="${pts}" class="series ${cls}"/>` : ""}${dots}`;
    };

    const labelDates = dates.length <= 4 ? dates : [dates[0], dates[Math.floor((dates.length - 1) / 2)], dates[dates.length - 1]];
    const xLabels = labelDates.map(date => {
      const [x] = svgPoint(date, 1, dates, width, height, maxRank, pad);
      return `<text x="${x}" y="${height - 9}" text-anchor="middle">${fmtDate(date).slice(0, 5)}</text>`;
    }).join("");

    chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Ranking Verlauf">${lines}${poly(organic, "gsc")}${poly(maps, "maps")}${xLabels}</svg>`;
  }

  function renderStatus() {
    const box = document.querySelector("#rankConfig");
    if (!box) return;
    box.className = "rank-config ready";
    box.innerHTML = `<span>Manueller Google-Check</span><span>Keine API nötig</span><b>Organic und Orte getrennt gespeichert</b>`;
  }

  function renderAll() {
    renderStatus();
    renderMetrics();
    if (!state.selected && state.data?.keywords?.length) state.selected = Number(state.data.keywords[0].id);
    renderRows();
    renderChart();
    const latestDate = (state.data?.history || []).map(r => r.rank_date).sort().pop();
    const updated = document.querySelector("#rankUpdated");
    if (updated) updated.textContent = latestDate ? `Letzter Check: ${fmtDate(latestDate)} · Startwert: 18.07.2026` : "Startwert: 18.07.2026";
  }

  function valueForDate(keywordId, source, date) {
    const row = (state.data?.history || []).find(r => Number(r.keyword_id) === Number(keywordId) && r.source === source && r.rank_date === date);
    if (!row) return "";
    return row.position == null ? "NA" : fmtPos(row.position);
  }

  function renderEditorRows(date) {
    const body = document.querySelector("#rankEditorRows");
    if (!body || !state.data) return;
    body.innerHTML = state.data.keywords.map(keyword => {
      const q = encodeURIComponent(keyword.keyword);
      return `
        <tr data-keyword-id="${keyword.id}">
          <td><b>${esc(keyword.keyword)}</b></td>
          <td><input class="rank-input" data-source="gsc" value="${esc(valueForDate(keyword.id, "gsc", date))}" placeholder="— / NA" inputmode="decimal"></td>
          <td><input class="rank-input" data-source="maps" value="${esc(valueForDate(keyword.id, "maps", date))}" placeholder="— / NA" inputmode="decimal"></td>
          <td class="rank-check-links"><a href="https://www.google.com/search?q=${q}&hl=de&gl=de&pws=0" target="_blank" rel="noopener">Google</a><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Maps</a></td>
        </tr>`;
    }).join("");
  }

  function openManualEditor() {
    if (!state.data) return;
    const editor = document.querySelector("#rankEditor");
    const dateInput = document.querySelector("#rankDate");
    const date = state.data.today || new Date().toISOString().slice(0, 10);
    dateInput.value = date;
    renderEditorRows(date);
    dateInput.onchange = () => renderEditorRows(dateInput.value);
    editor.hidden = false;
    editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeManualEditor() {
    const editor = document.querySelector("#rankEditor");
    if (editor) editor.hidden = true;
  }

  async function saveManualEditor() {
    const editor = document.querySelector("#rankEditor");
    const button = document.querySelector("#rankManualSave");
    const rankDate = document.querySelector("#rankDate")?.value;
    if (!editor || !button || !rankDate) return;

    const entries = [];
    editor.querySelectorAll("#rankEditorRows tr").forEach(row => {
      const keywordId = Number(row.dataset.keywordId);
      row.querySelectorAll(".rank-input").forEach(input => {
        const value = input.value.trim();
        if (!value) return;
        entries.push({ keyword_id: keywordId, source: input.dataset.source, position: value });
      });
    });

    if (!entries.length) {
      toast("Keine Rankings eingetragen");
      return;
    }

    button.disabled = true;
    button.textContent = "Speichere…";
    try {
      const result = await api("rankings/manual", {
        method: "POST",
        body: JSON.stringify({ rank_date: rankDate, entries })
      });
      toast(`${result.saved} Rankings für ${fmtDate(rankDate)} gespeichert`);
      closeManualEditor();
      state.data = null;
      await loadRankings(true);
    } catch (error) {
      toast(`Ranking: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = "Speichern";
    }
  }

  async function loadRankings(force = false) {
    ensureUi();
    const section = document.querySelector("#seoRankTracker");
    if (!section || Number(S.project) !== RANK_PROJECT_ID) return;
    section.hidden = false;
    if (state.loading) return;
    if (!force && state.data) {
      renderAll();
      return;
    }
    state.loading = true;
    section.classList.add("loading");
    try {
      const [data, status] = await Promise.all([
        api(`rankings/${RANK_PROJECT_ID}?days=${state.days}`),
        api("rankings/status")
      ]);
      state.data = data;
      state.status = status;
      if (!state.selected && data.keywords?.length) state.selected = Number(data.keywords[0].id);
      renderAll();
    } catch (error) {
      const box = document.querySelector("#rankConfig");
      if (box) {
        box.className = "rank-config warn";
        box.textContent = S.mode === "local" ? "Rankings benötigen Cloud Sync / D1." : `Rank Tracker Fehler: ${error.message}`;
      }
    } finally {
      state.loading = false;
      section.classList.remove("loading");
    }
  }

  ensureUi();
  const baseRenderDrawer = renderDrawer;
  renderDrawer = function rankAwareRenderDrawer() {
    baseRenderDrawer();
    ensureUi();
    const section = document.querySelector("#seoRankTracker");
    if (!section) return;
    const active = Number(S.project) === RANK_PROJECT_ID;
    section.hidden = !active;
    if (active) loadRankings();
  };
})();