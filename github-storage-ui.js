/* A+ Works — detect and present GitHub-backed project asset storage */
(() => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  Object.assign(L.de, {
    storageMissing: "GitHub-Speicher ist noch nicht verbunden. Hinterlege in Cloudflare das Secret GITHUB_TOKEN mit Schreibzugriff auf hsdarestani/works.",
    maxSize: "Maximal 10 MB pro Datei",
    fileTooLarge: "Die Datei ist größer als 10 MB."
  });

  Object.assign(L.fa, {
    storageMissing: "ذخیره‌سازی GitHub هنوز متصل نیست. در Cloudflare یک Secret با نام GITHUB_TOKEN و دسترسی نوشتن روی hsdarestani/works ثبت کن.",
    maxSize: "حداکثر حجم هر فایل ۱۰ مگابایت",
    fileTooLarge: "حجم فایل بیشتر از ۱۰ مگابایت است."
  });

  async function probeStorage() {
    if (!S.data || S.mode !== "remote") return false;

    const headers = {};
    if (sessionStorage.pw) headers["x-app-password"] = sessionStorage.pw;

    let enabled = false;
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers,
        body: new FormData()
      });
      const data = await response.json().catch(() => ({}));
      enabled = response.status === 400 || response.ok;
      if (data.code === "GITHUB_TOKEN_NOT_CONFIGURED" || data.code === "GITHUB_TOKEN_INVALID") {
        enabled = false;
      }
    } catch {
      enabled = false;
    }

    S.data.storage = {
      ...(S.data.storage || {}),
      enabled,
      provider: "github",
      max_file_size: MAX_FILE_SIZE
    };

    if (S.project) renderDrawer();
    return enabled;
  }

  const previousLoad = load;
  load = async function (...args) {
    const result = await previousLoad(...args);
    await probeStorage();
    return result;
  };

  [100, 400, 1000, 2200].forEach(delay => {
    setTimeout(() => {
      if (S.data) probeStorage();
    }, delay);
  });
})();
