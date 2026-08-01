/* A+ Works — project asset upload, rename, download and delete UI */
(() => {
  Object.assign(L.de, {
    assets: "Assets",
    uploadAsset: "Asset hochladen",
    assetName: "Anzeigename",
    assetNamePlaceholder: "z. B. Visitenkarte – finale Version",
    chooseFile: "Datei auswählen",
    noFileSelected: "Noch keine Datei ausgewählt",
    upload: "Hochladen",
    noAssets: "Für dieses Projekt wurden noch keine Dateien hochgeladen.",
    storageMissing: "Der Dateispeicher ist noch nicht verbunden. Erstelle einen R2-Bucket und binde ihn als FILES an diesen Worker.",
    localAssets: "Datei-Uploads funktionieren nur im Cloud-Sync-Modus.",
    maxSize: "Maximal 25 MB pro Datei",
    uploadedBy: "Hochgeladen von",
    renameAsset: "Asset umbenennen",
    deleteAsset: "Asset löschen",
    deleteConfirm: "Diese Datei dauerhaft löschen?",
    assetSaved: "Asset wurde hochgeladen.",
    assetRenamed: "Asset wurde umbenannt.",
    assetDeleted: "Asset wurde gelöscht.",
    fileTooLarge: "Die Datei ist größer als 25 MB.",
    assetError: "Die Datei konnte nicht verarbeitet werden."
  });

  Object.assign(L.fa, {
    assets: "فایل‌ها و دارایی‌ها",
    uploadAsset: "آپلود فایل",
    assetName: "نام نمایشی فایل",
    assetNamePlaceholder: "مثلاً کارت ویزیت – نسخه نهایی",
    chooseFile: "انتخاب فایل",
    noFileSelected: "هنوز فایلی انتخاب نشده",
    upload: "آپلود",
    noAssets: "هنوز فایلی برای این پروژه آپلود نشده است.",
    storageMissing: "فضای ذخیره‌سازی فایل هنوز متصل نیست. یک R2 Bucket بساز و با نام FILES به این Worker وصل کن.",
    localAssets: "آپلود فایل فقط در حالت همگام‌سازی ابری کار می‌کند.",
    maxSize: "حداکثر حجم هر فایل ۲۵ مگابایت",
    uploadedBy: "آپلودشده توسط",
    renameAsset: "تغییر نام فایل",
    deleteAsset: "حذف فایل",
    deleteConfirm: "این فایل برای همیشه حذف شود؟",
    assetSaved: "فایل آپلود شد.",
    assetRenamed: "نام فایل تغییر کرد.",
    assetDeleted: "فایل حذف شد.",
    fileTooLarge: "حجم فایل بیشتر از ۲۵ مگابایت است.",
    assetError: "پردازش فایل انجام نشد."
  });

  if (typeof ICON_PATHS !== "undefined") {
    Object.assign(ICON_PATHS, {
      file: '<path d="M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"></path><path d="M14 2v5h5M8 13h8M8 17h6"></path>',
      image: '<rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><path d="m5 18 5-5 3 3 2-2 4 4"></path>',
      pdf: '<path d="M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"></path><path d="M14 2v5h5M8 16v-5h2a1.5 1.5 0 0 1 0 3H8M13 16v-5h1.5a2.5 2.5 0 0 1 0 5H13M18 16v-5h3M18 13h2"></path>',
      archive: '<path d="M4 5h16v15H4Z"></path><path d="M3 2h18v4H3ZM10 9h4M10 13h4"></path>',
      video: '<rect x="3" y="5" width="14" height="14" rx="3"></rect><path d="m17 10 4-2v8l-4-2ZM8 9l5 3-5 3V9Z"></path>',
      audio: '<path d="M9 18V5l10-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="16" cy="16" r="3"></circle>',
      upload: '<path d="M12 16V4M7 9l5-5 5 5"></path><path d="M5 15v5h14v-5"></path>',
      download: '<path d="M12 4v12M7 11l5 5 5-5"></path><path d="M5 20h14"></path>',
      edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>',
      trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"></path>',
      warning: '<path d="m12 3 10 18H2L12 3Z"></path><path d="M12 9v5M12 18h.01"></path>'
    });
  }

  const settings = document.querySelector(".settings");
  if (!settings || document.querySelector("#assetsSection")) return;

  settings.insertAdjacentHTML("afterend", `
    <section class="assets-section" id="assetsSection">
      <div class="assets-head">
        <div class="assets-title">
          <span class="assets-title-icon">${uiIcon("folders")}</span>
          <h3 id="assetsTitle"></h3>
          <span class="assets-count" id="assetsCount">0</span>
        </div>
        <button class="primary asset-add-button" id="assetAddButton" type="button">
          ${uiIcon("upload")}<span id="assetAddText"></span>
        </button>
      </div>

      <div class="asset-storage-hint inset" id="assetStorageHint" hidden>
        ${uiIcon("warning")}
        <span id="assetStorageText"></span>
      </div>

      <form class="asset-upload inset" id="assetUploadForm" hidden>
        <div class="asset-upload-grid">
          <label class="asset-field">
            <span id="assetNameLabel"></span>
            <input id="assetNameInput" maxlength="160" required />
          </label>
          <label class="asset-field">
            <span id="assetFileLabel"></span>
            <span class="asset-file-picker">
              ${uiIcon("file")}
              <span id="assetFileText"></span>
              <input id="assetFileInput" type="file" required />
            </span>
          </label>
          <div class="asset-upload-actions">
            <button class="secondary" id="assetCancelButton" type="button"></button>
            <button class="primary" id="assetUploadButton" type="submit">
              ${uiIcon("upload")}<span id="assetUploadText"></span>
            </button>
          </div>
        </div>
        <small class="taskmeta" id="assetSizeHint"></small>
        <div class="asset-upload-progress" id="assetUploadProgress" hidden><i></i></div>
      </form>

      <div class="asset-list" id="assetList"></div>
    </section>
  `);

  const els = {
    section: $("#assetsSection"),
    title: $("#assetsTitle"),
    count: $("#assetsCount"),
    add: $("#assetAddButton"),
    addText: $("#assetAddText"),
    hint: $("#assetStorageHint"),
    hintText: $("#assetStorageText"),
    form: $("#assetUploadForm"),
    nameLabel: $("#assetNameLabel"),
    name: $("#assetNameInput"),
    fileLabel: $("#assetFileLabel"),
    file: $("#assetFileInput"),
    fileText: $("#assetFileText"),
    cancel: $("#assetCancelButton"),
    upload: $("#assetUploadButton"),
    uploadText: $("#assetUploadText"),
    sizeHint: $("#assetSizeHint"),
    progress: $("#assetUploadProgress"),
    list: $("#assetList")
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function ensureAssetState() {
    if (!S.data) return;
    if (!Array.isArray(S.data.assets)) S.data.assets = [];
    if (!S.data.storage) S.data.storage = { enabled: false, max_file_size: 25 * 1024 * 1024 };
  }

  function projectAssets() {
    ensureAssetState();
    return (S.data?.assets || [])
      .filter(asset => +asset.project_id === +S.project)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function formatSize(bytes) {
    const size = Number(bytes || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 ** 2).toFixed(1)} MB`;
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(S.lang === "fa" ? "fa-IR" : "de-DE", {
        year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return "";
    }
  }

  function iconType(contentType, filename) {
    const type = String(contentType || "").toLowerCase();
    const name = String(filename || "").toLowerCase();
    if (type.startsWith("image/")) return ["image", "image"];
    if (type === "application/pdf" || name.endsWith(".pdf")) return ["pdf", "pdf"];
    if (type.startsWith("video/")) return ["video", "video"];
    if (type.startsWith("audio/")) return ["audio", "audio"];
    if (/zip|rar|7z|tar|gzip/.test(type) || /\.(zip|rar|7z|tar|gz)$/.test(name)) return ["archive", "archive"];
    return ["file", "file"];
  }

  async function assetRequest(path, options = {}, blob = false) {
    const headers = { ...(options.headers || {}) };
    const password = sessionStorage.pw;
    if (password) headers["x-app-password"] = password;

    const response = await fetch(`/api/${path}`, { ...options, headers });
    if (response.status === 401) throw new AuthE();
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.error || tr("assetError"));
      error.code = data.code;
      throw error;
    }
    return blob ? response.blob() : response.json();
  }

  function updateTexts() {
    els.title.textContent = tr("assets");
    els.addText.textContent = tr("uploadAsset");
    els.nameLabel.textContent = tr("assetName");
    els.name.placeholder = tr("assetNamePlaceholder");
    els.fileLabel.textContent = tr("chooseFile");
    els.cancel.textContent = tr("cancel");
    els.uploadText.textContent = tr("upload");
    els.sizeHint.textContent = tr("maxSize");
    if (!els.file.files?.length) els.fileText.textContent = tr("noFileSelected");
  }

  function closeUploadForm() {
    els.form.hidden = true;
    els.form.reset();
    els.fileText.textContent = tr("noFileSelected");
    els.progress.hidden = true;
    els.upload.disabled = false;
  }

  function renderAssets() {
    if (!S.data || !S.project) return;
    ensureAssetState();
    updateTexts();

    const assets = projectAssets();
    const storageEnabled = S.mode === "remote" && Boolean(S.data.storage?.enabled);
    els.count.textContent = assets.length;
    els.add.disabled = !storageEnabled;
    els.add.style.opacity = storageEnabled ? "1" : ".5";

    if (!storageEnabled) {
      els.hint.hidden = false;
      els.hintText.textContent = S.mode === "remote" ? tr("storageMissing") : tr("localAssets");
      closeUploadForm();
    } else {
      els.hint.hidden = true;
    }

    if (!assets.length) {
      els.list.innerHTML = `<div class="asset-empty">${escapeHtml(tr("noAssets"))}</div>`;
      return;
    }

    els.list.innerHTML = assets.map(asset => {
      const [icon, iconClass] = iconType(asset.content_type, asset.original_name);
      return `
        <article class="asset-row soft" data-asset-id="${asset.id}">
          <span class="asset-type-icon ${iconClass}">${uiIcon(icon)}</span>
          <div class="asset-copy">
            <strong>${escapeHtml(asset.name)}</strong>
            <small>${escapeHtml(asset.original_name)}</small>
            <div class="asset-meta">
              <span>${formatSize(asset.size)}</span>
              <span>${escapeHtml(tr("uploadedBy"))}: ${escapeHtml(asset.uploaded_by)}</span>
              <span>${escapeHtml(formatDate(asset.created_at))}</span>
            </div>
            <form class="asset-rename-form" hidden>
              <input maxlength="160" value="${escapeHtml(asset.name)}" required />
              <button type="submit" title="${escapeHtml(tr("save"))}">${uiIcon("save")}</button>
              <button type="button" data-rename-cancel title="${escapeHtml(tr("cancel"))}">${uiIcon("close")}</button>
            </form>
          </div>
          <div class="asset-actions">
            <button class="asset-action" data-download title="${escapeHtml(tr("download"))}">${uiIcon("download")}</button>
            <button class="asset-action" data-rename title="${escapeHtml(tr("renameAsset"))}">${uiIcon("edit")}</button>
            <button class="asset-action danger" data-delete title="${escapeHtml(tr("deleteAsset"))}">${uiIcon("trash")}</button>
          </div>
        </article>
      `;
    }).join("");

    els.list.querySelectorAll(".asset-row").forEach(row => {
      const id = +row.dataset.assetId;
      const asset = assets.find(item => +item.id === id);
      const renameForm = row.querySelector(".asset-rename-form");

      row.querySelector("[data-download]").onclick = () => downloadAsset(asset);
      row.querySelector("[data-rename]").onclick = () => {
        renameForm.hidden = false;
        renameForm.querySelector("input").focus();
        renameForm.querySelector("input").select();
      };
      row.querySelector("[data-rename-cancel]").onclick = () => {
        renameForm.hidden = true;
        renameForm.querySelector("input").value = asset.name;
      };
      row.querySelector("[data-delete]").onclick = () => removeAsset(asset);
      renameForm.onsubmit = event => renameAsset(event, asset);
    });
  }

  async function uploadAsset(event) {
    event.preventDefault();
    const file = els.file.files?.[0];
    const max = Number(S.data.storage?.max_file_size || 25 * 1024 * 1024);
    if (!file) return;
    if (file.size > max) {
      toast(tr("fileTooLarge"));
      return;
    }

    const form = new FormData();
    form.append("project_id", String(S.project));
    form.append("name", els.name.value.trim() || file.name);
    form.append("uploaded_by", S.author);
    form.append("file", file);

    els.progress.hidden = false;
    els.upload.disabled = true;
    try {
      const created = await assetRequest("assets", { method: "POST", body: form });
      S.data.assets.push(created);
      closeUploadForm();
      renderAssets();
      toast(tr("assetSaved"));
    } catch (error) {
      if (error instanceof AuthE) {
        $("#auth").hidden = false;
      } else {
        if (error.code === "R2_NOT_CONFIGURED") {
          S.data.storage.enabled = false;
          renderAssets();
        }
        toast(error.code === "FILE_TOO_LARGE" ? tr("fileTooLarge") : (error.message || tr("assetError")));
      }
    } finally {
      els.progress.hidden = true;
      els.upload.disabled = false;
    }
  }

  async function downloadAsset(asset) {
    try {
      const blob = await assetRequest(`assets/${asset.id}/download`, { method: "GET" }, true);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = asset.original_name || asset.name || "download";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      toast(error.message || tr("assetError"));
    }
  }

  async function renameAsset(event, asset) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.querySelector("input").value.trim();
    if (!name) return;
    try {
      const updated = await assetRequest(`assets/${asset.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name })
      });
      Object.assign(asset, updated);
      renderAssets();
      toast(tr("assetRenamed"));
    } catch (error) {
      toast(error.message || tr("assetError"));
    }
  }

  async function removeAsset(asset) {
    if (!window.confirm(tr("deleteConfirm"))) return;
    try {
      await assetRequest(`assets/${asset.id}`, { method: "DELETE" });
      S.data.assets = S.data.assets.filter(item => +item.id !== +asset.id);
      renderAssets();
      toast(tr("assetDeleted"));
    } catch (error) {
      toast(error.message || tr("assetError"));
    }
  }

  els.add.onclick = () => {
    if (els.add.disabled) return;
    els.form.hidden = !els.form.hidden;
    if (!els.form.hidden) els.name.focus();
  };
  els.cancel.onclick = closeUploadForm;
  els.form.onsubmit = uploadAsset;
  els.file.onchange = () => {
    const file = els.file.files?.[0];
    els.fileText.textContent = file ? file.name : tr("noFileSelected");
    if (file && !els.name.value.trim()) {
      els.name.value = file.name.replace(/\.[^.]+$/, "");
    }
  };

  const previousRenderDrawer = renderDrawer;
  renderDrawer = function () {
    previousRenderDrawer();
    renderAssets();
  };

  const previousI18n = i18n;
  i18n = function () {
    previousI18n();
    if (S.data && S.project) renderAssets();
  };

  setTimeout(() => {
    if (S.data && S.project) renderAssets();
  }, 0);
})();
