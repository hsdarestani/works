PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_fa TEXT,
  type TEXT NOT NULL CHECK (type IN ('own_company','own_product','website_client','app_client','demo')),
  website_url TEXT,
  accent TEXT NOT NULL DEFAULT '#6f62e8',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  title_de TEXT NOT NULL,
  title_fa TEXT,
  description_de TEXT,
  description_fa TEXT,
  kind TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'planning',
  url TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
  created_by TEXT NOT NULL DEFAULT 'Unknown',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  parent_id INTEGER,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_account ON projects(account_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, completed, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

INSERT OR IGNORE INTO accounts (id, slug, name, name_fa, type, website_url, accent, sort_order) VALUES
  (1, 'aplus-solution', 'A+ Solution', 'A+ Solution', 'own_company', 'https://aplus-solution.de', '#6f62e8', 1),
  (2, 'aplus-esthetic', 'A+ Esthetic', 'A+ Esthetic', 'own_company', 'https://a-esthetic.de', '#b97591', 2),
  (3, 'aplus-products', 'A+ Products', 'محصولات A+', 'own_product', NULL, '#36a7ba', 3),
  (10, 'esg24', 'ESG24', 'ESG24', 'website_client', 'https://www.esg24.com', '#56a66c', 10),
  (11, 'blitz', 'Blitz Entrümpelung Frankfurt', 'Blitz Entrümpelung Frankfurt', 'website_client', 'https://blitzentruempelungfrankfurt.de', '#d29d43', 11),
  (12, 'kayi-haustechnik', 'Kayi Haustechnik', 'Kayi Haustechnik', 'website_client', NULL, '#568ea6', 12),
  (13, 'rot-weiss-frankfurt', 'Rot-Weiss Frankfurt', 'Rot-Weiss Frankfurt', 'website_client', NULL, '#c85e68', 13),
  (14, 'schoenbau', 'Schönbau', 'Schönbau', 'website_client', 'https://schoenbau-gmbh.com', '#9b7653', 14),
  (15, 'manuel-hoefel', 'Manuel Höfel Catering', 'Manuel Höfel Catering', 'website_client', NULL, '#bd7b4f', 15),
  (16, 'aymantraining', 'Ayman Training', 'Ayman Training', 'website_client', NULL, '#4d8cb3', 16),
  (17, 'shervinaesthetics', 'Shervin Aesthetics', 'Shervin Aesthetics', 'website_client', NULL, '#bd7196', 17),
  (18, 'citaimmobilien', 'Cita Immobilien', 'Cita Immobilien', 'website_client', NULL, '#657eaa', 18),
  (19, 'drwickler', 'Dr. Wickler', 'Dr. Wickler', 'website_client', NULL, '#4f9b98', 19),
  (20, 'pro-clean-aschaffenburg', 'Pro Clean Aschaffenburg', 'Pro Clean Aschaffenburg', 'website_client', NULL, '#4f9b75', 20),
  (21, 'niederrad', 'Niederrad', 'Niederrad', 'website_client', NULL, '#7788a8', 21),
  (22, 'haus-aloys', 'Haus Aloys', 'Haus Aloys', 'website_client', NULL, '#9a805c', 22),
  (23, 'seniorenheim', 'Seniorenheim', 'Seniorenheim', 'website_client', NULL, '#789d72', 23),
  (24, 'puracai', 'Puracai', 'Puracai', 'website_client', NULL, '#8d6fbb', 24),
  (30, 'sams', 'SAMS', 'SAMS', 'app_client', NULL, '#5a86c7', 30),
  (40, 'atlas-demo', 'Atlas', 'Atlas', 'demo', 'https://atlas.smarbiz.sbs/', '#4aa3aa', 40),
  (41, 'citybeach-demo', 'CityBeach', 'CityBeach', 'demo', 'https://citybeach.smarbiz.sbs/', '#d49757', 41),
  (42, 'eintracht-demo', 'Eintracht', 'Eintracht', 'demo', 'https://eintracht.smarbiz.sbs/', '#ca626a', 42),
  (43, 'football-demo', 'Football', 'Football', 'demo', 'https://football.smarbiz.sbs/', '#58a16d', 43);

INSERT OR IGNORE INTO projects (id, account_id, title_de, title_fa, description_de, description_fa, kind, status, url, progress, sort_order) VALUES
  (101, 1, 'Website & SEO', 'سایت و سئو', 'Technisches SEO, Content, Performance und laufende Optimierung der Hauptwebsite.', 'سئوی فنی، محتوا، پرفورمنس و بهینه‌سازی مستمر سایت اصلی.', 'seo', 'in_progress', 'https://aplus-solution.de', 68, 1),
  (102, 1, 'Website Redesign', 'بازطراحی سایت', 'Neue Seitenstruktur, klarere Services und ein stärkerer digitaler Markenauftritt.', 'ساختار جدید صفحات، معرفی روشن‌تر خدمات و هویت دیجیتال قوی‌تر.', 'redesign', 'in_progress', 'https://aplus-solution.de', 55, 2),
  (103, 1, 'A+ Solution App', 'اپ A+ Solution', 'Interne und kundenorientierte App für Services, Prozesse und digitale Lösungen.', 'اپ داخلی و مشتری‌محور برای سرویس‌ها، فرایندها و راهکارهای دیجیتال.', 'app', 'planning', NULL, 28, 3),
  (104, 1, '3D Website — Version 1', 'سایت سه‌بعدی — نسخه ۱', 'Erster interaktiver 3D-Website-Prototyp für A+ Solution.', 'اولین پروتوتایپ تعاملی سه‌بعدی سایت A+ Solution.', 'demo', 'demo', 'https://aplus3d.pages.dev', 100, 4),
  (105, 1, '3D Website — Version 2', 'سایت سه‌بعدی — نسخه ۲', 'Weiterentwickelte 3D-Variante mit alternativer Experience und Präsentation.', 'نسخه توسعه‌یافته سه‌بعدی با تجربه و پرزنت متفاوت.', 'demo', 'demo', 'https://aplus3dv2.pages.dev', 100, 5),
  (201, 2, 'Website & SEO', 'سایت و سئو', 'SEO, Content-Struktur, technische Optimierung und lokale Sichtbarkeit.', 'سئو، ساختار محتوا، بهینه‌سازی فنی و دیده‌شدن محلی.', 'seo', 'in_progress', 'https://a-esthetic.de', 64, 1),
  (202, 2, 'Website Redesign', 'بازطراحی سایت', 'Conversion-stärkere Behandlungsseiten, Landingpages und visuelle Modernisierung.', 'صفحات خدمات و لندینگ‌های پربازده‌تر همراه با نوسازی ظاهر سایت.', 'redesign', 'in_progress', 'https://a-esthetic.de', 62, 2),
  (203, 2, 'A+ Esthetic App', 'اپ A+ Esthetic', 'Beauty- und Praxis-App mit Erinnerungen, Membership, Angeboten und Kundenbindung.', 'اپ زیبایی و کلینیک با یادآوری، عضویت، آفر و وفادارسازی مشتری.', 'app', 'in_progress', NULL, 48, 3),
  (301, 3, 'Parking', 'Parking', 'Eigene Produktidee für Parkplatzsuche, Reservierung oder Flächenmanagement.', 'محصول خودمان برای جستجو، رزرو یا مدیریت فضای پارکینگ.', 'product', 'idea', NULL, 15, 1),
  (302, 3, 'SmartDocs', 'SmartDocs', 'Dokumenten- und Workflow-Produkt für Teams und Dienstleister.', 'محصول مدیریت اسناد و ورک‌فلو برای تیم‌ها و کسب‌وکارهای خدماتی.', 'product', 'planning', NULL, 34, 2),
  (303, 3, 'Publisher', 'Publisher', 'Publishing- und Content-Workflow für mehrere Kanäle.', 'ورک‌فلو انتشار و مدیریت محتوا برای چند کانال.', 'product', 'planning', NULL, 22, 3),
  (304, 3, 'Studio', 'Studio', 'Studio-Management und Buchungs-/Produktionsprozesse als digitale Lösung.', 'مدیریت استودیو و فرایند رزرو/تولید به‌عنوان یک راهکار دیجیتال.', 'product', 'idea', NULL, 18, 4),
  (305, 3, 'SmarBiz', 'SmarBiz', 'Modulares Business-System für kleine Unternehmen und branchenspezifische Demos.', 'سیستم ماژولار کسب‌وکار برای شرکت‌های کوچک و دموهای تخصصی هر حوزه.', 'product', 'in_progress', 'https://smarbiz.sbs', 52, 5),
  (306, 3, 'Team Management', 'Team Management', 'Planung, Aufgaben, Rollen und Zusammenarbeit für operative Teams.', 'برنامه‌ریزی، تسک، نقش‌ها و همکاری برای تیم‌های اجرایی.', 'product', 'planning', NULL, 26, 6),
  (307, 3, 'A+ Pay', 'A+ Pay', 'Zahlungs- und Abrechnungsprodukt im A+ Ökosystem.', 'محصول پرداخت و تسویه در اکوسیستم A+.', 'product', 'idea', NULL, 10, 7),
  (308, 3, 'Football Management App', 'اپ مدیریت فوتبال', 'Team-, Spieler-, Trainings- und Spielmanagement für Fußballorganisationen.', 'مدیریت تیم، بازیکن، تمرین و مسابقه برای مجموعه‌های فوتبالی.', 'product', 'planning', 'https://football.smarbiz.sbs/', 31, 8),
  (309, 3, 'When I Work', 'When I Work', 'Schicht- und Einsatzplanung für Teams und Dienstleister.', 'برنامه‌ریزی شیفت و نیروی کاری برای تیم‌ها و کسب‌وکارهای خدماتی.', 'product', 'planning', NULL, 20, 9),
  (401, 10, 'Website Demo', 'دموی وب‌سایت', 'Moderner Website-Entwurf als Akquise- und Relaunch-Demo.', 'طرح مدرن وب‌سایت به‌عنوان دمو برای جذب و بازطراحی نهایی.', 'demo', 'demo', 'https://www.esg24.com', 65, 1),
  (402, 11, 'Website & Betrieb', 'سایت و نگهداری', 'Website, Hosting, Domain und laufende technische Betreuung.', 'سایت، هاست، دامنه و پشتیبانی فنی مستمر.', 'website', 'live', 'https://blitzentruempelungfrankfurt.de', 100, 1),
  (403, 12, 'Website Demo', 'دموی وب‌سایت', 'Website-Demo für Haustechnik und lokale Kundengewinnung.', 'دموی سایت برای خدمات تاسیسات و جذب مشتری محلی.', 'demo', 'demo', NULL, 40, 1),
  (404, 13, 'Website Demo', 'دموی وب‌سایت', 'Digitale Vereinspräsentation und Website-Konzept.', 'پرزنت دیجیتال باشگاه و کانسپت وب‌سایت.', 'demo', 'demo', NULL, 35, 1),
  (405, 14, 'Website & Betreuung', 'سایت و پشتیبانی', 'Gerüstbau-Website, Formulare, Hosting und kontinuierliche Weiterentwicklung.', 'سایت داربست، فرم‌ها، هاست و توسعه مستمر.', 'website', 'live', 'https://schoenbau-gmbh.com', 100, 1),
  (406, 15, 'Website Demo', 'دموی وب‌سایت', 'Catering-Website und digitales Angebotskonzept.', 'دموی سایت کیترینگ و کانسپت ارائه خدمات دیجیتال.', 'demo', 'planning', NULL, 30, 1),
  (407, 16, 'Website Demo', 'دموی وب‌سایت', 'Training-Website mit Lead- und Angebotsfokus.', 'دموی سایت تمرین و مربیگری با تمرکز بر لید و آفر.', 'demo', 'demo', NULL, 42, 1),
  (408, 17, 'Website Demo', 'دموی وب‌سایت', 'Aesthetic-Website mit Premium-Präsentation und Conversion-Fokus.', 'دموی سایت زیبایی با ظاهر پریمیوم و تمرکز بر تبدیل.', 'demo', 'demo', NULL, 44, 1),
  (409, 18, 'Website Demo', 'دموی وب‌سایت', 'Immobilien-Website für Objekte, Anfragen und Vertrauen.', 'دموی سایت املاک برای فایل‌ها، درخواست‌ها و اعتمادسازی.', 'demo', 'demo', NULL, 38, 1),
  (410, 19, 'Website Demo', 'دموی وب‌سایت', 'Praxis-/Arzt-Website mit klarer Leistungsstruktur.', 'دموی سایت پزشک/مطب با ساختار روشن خدمات.', 'demo', 'planning', NULL, 25, 1),
  (411, 20, 'Website Demo', 'دموی وب‌سایت', 'Reinigungswebsite für lokale Sichtbarkeit und Anfragen.', 'دموی سایت نظافت برای دیده‌شدن محلی و دریافت درخواست.', 'demo', 'demo', NULL, 46, 1),
  (412, 21, 'Website Demo', 'دموی وب‌سایت', 'Lokales Website-Konzept für Niederrad.', 'کانسپت وب‌سایت محلی برای Niederrad.', 'demo', 'idea', NULL, 15, 1),
  (413, 22, 'Website Demo', 'دموی وب‌سایت', 'Digitale Präsentation für Haus Aloys.', 'پرزنت دیجیتال برای Haus Aloys.', 'demo', 'planning', NULL, 20, 1),
  (414, 23, 'Website Demo', 'دموی وب‌سایت', 'Vertrauensvolle Seniorenheim-Website mit Leistungen und Kontaktwegen.', 'دموی سایت خانه سالمندان با معرفی خدمات و راه‌های تماس.', 'demo', 'planning', NULL, 24, 1),
  (415, 24, 'Website Demo', 'دموی وب‌سایت', 'Marken- und Website-Konzept für Puracai.', 'کانسپت برند و وب‌سایت برای Puracai.', 'demo', 'idea', NULL, 12, 1),
  (601, 30, 'SAMS App', 'اپ SAMS', 'Fertiggestellte Kundenanwendung inklusive finaler Produktversion.', 'اپلیکیشن نهایی مشتری با نسخه کامل محصول.', 'app', 'done', NULL, 100, 1),
  (701, 40, 'Atlas App Demo', 'دموی اپ Atlas', 'Interaktive SmarBiz-Demo für Atlas.', 'دموی تعاملی SmarBiz برای Atlas.', 'demo', 'demo', 'https://atlas.smarbiz.sbs/', 100, 1),
  (702, 41, 'CityBeach App Demo', 'دموی اپ CityBeach', 'Branchenspezifische SmarBiz-Demo für CityBeach.', 'دموی تخصصی SmarBiz برای CityBeach.', 'demo', 'demo', 'https://citybeach.smarbiz.sbs/', 100, 1),
  (703, 42, 'Eintracht App Demo', 'دموی اپ Eintracht', 'Vereins- und Community-Demo auf SmarBiz-Basis.', 'دموی باشگاه و کامیونیتی بر پایه SmarBiz.', 'demo', 'demo', 'https://eintracht.smarbiz.sbs/', 100, 1),
  (704, 43, 'Football App Demo', 'دموی اپ Football', 'Demo für Fußball-, Team- und Spielermanagement.', 'دموی مدیریت فوتبال، تیم و بازیکن.', 'demo', 'demo', 'https://football.smarbiz.sbs/', 100, 1);

INSERT OR IGNORE INTO tasks (id, project_id, title, completed, created_by, created_at) VALUES
  (1, 101, 'Technisches SEO-Audit aktualisieren', 0, 'Hossein', '2026-08-01T10:00:00.000Z'),
  (2, 102, 'Neue Homepage-Struktur finalisieren', 0, 'Hossein', '2026-08-01T10:10:00.000Z'),
  (3, 104, '3D-Demo auf Mobile prüfen', 1, 'Hossein', '2026-07-30T15:00:00.000Z'),
  (4, 201, 'Behandlungsseiten nach Priorität sortieren', 0, 'Ashkan', '2026-08-01T10:20:00.000Z'),
  (5, 203, 'MVP-Funktionen für App festlegen', 0, 'Hossein', '2026-08-01T10:30:00.000Z'),
  (6, 305, 'Demo-Kategorien dokumentieren', 0, 'Hossein', '2026-08-01T10:40:00.000Z'),
  (7, 405, 'Formularzustellung nach Domainumzug testen', 1, 'Hossein', '2026-07-30T16:00:00.000Z'),
  (8, 601, 'Finale Übergabe dokumentieren', 0, 'Ashkan', '2026-08-01T10:50:00.000Z');

INSERT OR IGNORE INTO comments (id, task_id, parent_id, author, body, created_at) VALUES
  (1, 2, NULL, 'Ashkan', 'Bitte Staffing und Digital Solutions klar voneinander trennen.', '2026-08-01T11:00:00.000Z'),
  (2, 2, 1, 'Hossein', 'Ja, ich setze den Einstieg als klare Auswahl zwischen beiden Bereichen um.', '2026-08-01T11:12:00.000Z'),
  (3, 5, NULL, 'Hossein', 'Erinnerungen, Membership und Angebote kommen sicher in das MVP.', '2026-08-01T11:20:00.000Z');
