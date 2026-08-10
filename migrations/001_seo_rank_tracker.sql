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
);

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
);

CREATE INDEX IF NOT EXISTS idx_seo_rank_keywords_project
  ON seo_rank_keywords(project_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_seo_rank_history_lookup
  ON seo_rank_history(keyword_id, source, rank_date);
