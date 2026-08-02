/* A+ Works — create customer files with one small form */
(() => {
  S.author = 'Hossein';
  localStorage.author = 'Hossein';

  Object.assign(L.de, {
    newaccount: 'Neue Akte',
    createaccount: 'Akte anlegen',
    accountname: 'Name',
    accounttype: 'Typ',
    accounturl: 'Website-/Demo-Link (optional)',
    accountcreated: 'Akte wurde angelegt.',
    initialdemo: 'Website Demo'
  });
  Object.assign(L.fa, {
    newaccount: 'پرونده جدید',
    createaccount: 'ساخت پرونده',
    accountname: 'نام پرونده',
    accounttype: 'نوع پرونده',
    accounturl: 'لینک سایت یا دمو (اختیاری)',
    accountcreated: 'پرونده ساخته شد.',
    initialdemo: 'دموی وب‌سایت'
  });

  const BROO_ACCOUNT = {
    id: 25,
    slug: 'broo-performance',
    name: 'Broo Performance',
    name_fa: 'Broo Performance',
    type: 'website_client',
    website_url: 'https://broo-performance.pages.dev/',
    accent: '#d85b45',
    sort_order: 25,
    created_at: new Date().toISOString()
  };
  const BROO_PROJECT = {
    id: 416,
    account_id: 25,
    title_de: 'Website Demo',
    title_fa: 'دموی وب‌سایت',
    description_de: 'Website-Demo für Broo Performance.',
    description_fa: 'دموی وب‌سایت Broo Performance.',
    kind: 'demo',
    status: 'in_progress',
    url: 'https://broo-performance.pages.dev/',
    progress: 20,
    sort_order: 1,
    created_at: new Date().toISOString()
  };

  function ensureBrooLocal() {
    if (!S.data) return;
    if (!S.data.accounts.some(account => +account.id === 25 || account.slug === 'broo-performance')) {
      S.data.accounts.push({ ...BROO_ACCOUNT });
    }
    if (!S.data.projects.some(project => +project.id === 416)) {
      S.data.projects.push({ ...BROO_PROJECT });
    }
    if (S.mode === 'local') save();
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="account-modal" id="accountModal" hidden>
      <div class="account-modal-back" data-account-close></div>
      <section class="account-modal-box">
        <header class="account-modal-head">
          <h2 id="accountModalTitle"></h2>
          <button class="close" type="button" data-account-close>×</button>
        </header>
        <form class="account-form" id="accountForm">
          <label><span id="accountNameLabel"></span><input id="accountName" maxlength="160" required></label>
          <label><span id="accountTypeLabel"></span><select id="accountType"></select></label>
          <label><span id="accountUrlLabel"></span><input id="accountUrl" type="url" placeholder="https://…"></label>
          <div class="account-form-actions">
            <button class="secondary" type="button" data-account-close id="accountCancel"></button>
            <button class="primary" type="submit" id="accountSubmit"></button>
          </div>
        </form>
      </section>
    </div>
  `);

  const modal = $('#accountModal');
  const form = $('#accountForm');

  function updateAccountTexts() {
    $('#accountModalTitle').textContent = tr('createaccount');
    $('#accountNameLabel').textContent = tr('accountname');
    $('#accountTypeLabel').textContent = tr('accounttype');
    $('#accountUrlLabel').textContent = tr('accounturl');
    $('#accountCancel').textContent = tr('cancel');
    $('#accountSubmit').textContent = tr('createaccount');
    $('#accountType').innerHTML = [
      ['website_client', tr('website_client')],
      ['app_client', tr('app_client')],
      ['demo', tr('demo')],
      ['own_company', tr('own_company')],
      ['own_product', tr('own_product')]
    ].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    const button = $('#newAccountButton');
    if (button) button.querySelector('span').textContent = tr('newaccount');
  }

  function addAccountButton() {
    const filters = document.querySelector('.filters');
    if (!filters || $('#newAccountButton')) return;
    const button = document.createElement('button');
    button.id = 'newAccountButton';
    button.type = 'button';
    button.className = 'new-account-button';
    button.innerHTML = `<b>＋</b><span>${tr('newaccount')}</span>`;
    button.onclick = () => {
      updateAccountTexts();
      form.reset();
      $('#accountType').value = 'website_client';
      modal.hidden = false;
      $('#accountName').focus();
    };
    filters.append(button);
  }

  function closeModal() {
    modal.hidden = true;
  }
  document.querySelectorAll('[data-account-close]').forEach(element => {
    element.onclick = closeModal;
  });

  async function createAccount(payload) {
    if (S.mode === 'remote') {
      return api('accounts', { method: 'POST', body: JSON.stringify(payload) });
    }
    const id = next(S.data.accounts);
    const sortOrder = S.data.accounts.reduce((max, item) => Math.max(max, +item.sort_order || 0), 0) + 1;
    return {
      id,
      slug: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`,
      name: payload.name,
      name_fa: payload.name,
      type: payload.type,
      website_url: payload.website_url || null,
      accent: '#d06a4f',
      sort_order: sortOrder,
      created_at: new Date().toISOString()
    };
  }

  async function createInitialProject(account, url) {
    if (!url) return null;
    const payload = {
      account_id: account.id,
      title_de: 'Website Demo',
      title_fa: 'دموی وب‌سایت',
      kind: 'demo',
      status: 'in_progress',
      url,
      progress: 10
    };
    if (S.mode === 'remote') return api('projects', { method: 'POST', body: JSON.stringify(payload) });
    const created = {
      id: next(S.data.projects),
      account_id: account.id,
      title_de: payload.title_de,
      title_fa: payload.title_fa,
      description_de: '',
      description_fa: '',
      kind: 'demo',
      status: 'in_progress',
      url,
      progress: 10,
      sort_order: 1,
      created_at: new Date().toISOString()
    };
    S.data.projects.push(created);
    return created;
  }

  form.onsubmit = async event => {
    event.preventDefault();
    const payload = {
      name: $('#accountName').value.trim(),
      type: $('#accountType').value,
      website_url: $('#accountUrl').value.trim() || null
    };
    if (!payload.name) return;

    $('#accountSubmit').disabled = true;
    try {
      const account = await createAccount(payload);
      S.data.accounts.push(account);
      const project = await createInitialProject(account, payload.website_url);
      if (S.mode === 'remote' && project) S.data.projects.push(project);
      if (S.mode === 'local') save();
      S.open.add(+account.id);
      closeModal();
      render();
      toast(tr('accountcreated'));
    } catch (error) {
      toast(error.message || tr('err'));
    } finally {
      $('#accountSubmit').disabled = false;
    }
  };

  const originalRender = render;
  render = function () {
    ensureBrooLocal();
    originalRender();
    addAccountButton();
    updateAccountTexts();
  };

  const originalI18n = i18n;
  i18n = function () {
    originalI18n();
    updateAccountTexts();
  };

  [0, 250, 1000].forEach(delay => setTimeout(() => {
    ensureBrooLocal();
    addAccountButton();
    updateAccountTexts();
  }, delay));
})();
