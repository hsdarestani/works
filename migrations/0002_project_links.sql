PRAGMA foreign_keys = ON;

UPDATE projects SET url = 'https://solution.smarbiz.sbs' WHERE id = 103;
UPDATE projects SET url = 'https://esthetic.smarbiz.sbs' WHERE id = 203;
UPDATE projects SET url = 'https://parkplatz.smarbiz.sbs' WHERE id = 301;
UPDATE projects SET url = 'http://smartdocs.aplus-solution.de/' WHERE id = 302;
UPDATE projects SET url = 'http://publisher.smarbiz.sbs/' WHERE id = 303;
UPDATE projects SET url = 'https://studio.aplus-solution.de/' WHERE id = 304;
UPDATE projects SET url = 'https://team.smarbiz.sbs/' WHERE id = 306;
UPDATE projects SET url = 'https://pay.smarbiz.sbs/' WHERE id = 307;
UPDATE projects SET url = 'https://aplus-solution.de/wiw' WHERE id = 309;
UPDATE projects SET url = 'http://cards.smarbiz.sbs/' WHERE id = 601;

INSERT OR IGNORE INTO projects (
  id,
  account_id,
  title_de,
  title_fa,
  description_de,
  description_fa,
  kind,
  status,
  url,
  progress,
  sort_order
) VALUES (
  310,
  3,
  'Arbeitszeitkonto',
  'حساب ساعات کاری',
  '',
  '',
  'product',
  'planning',
  'https://aplus-solution.de/arbeitszeitkonto/',
  20,
  10
);
