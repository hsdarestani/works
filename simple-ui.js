/* A+ Works — simplified interface without render loops */
(() => {
  document.body.classList.add('simple-mode');

  Object.assign(L.de, {
    hero: 'Projekte & Aufgaben',
    herop: 'Kunde öffnen, Projekt auswählen und direkt Aufgaben oder Dateien hinzufügen.',
    guide1: 'Kundenakte finden',
    guide2: 'Projekt öffnen',
    guide3: 'Aufgabe oder Datei hinzufügen',
    tabTasks: 'Aufgaben',
    tabFiles: 'Dateien',
    tabInfo: 'Details',
    infoHint: 'Hier kannst du Status, Projekt-Link und Fortschritt ändern.'
  });
  Object.assign(L.fa, {
    hero: 'پروژه‌ها و تسک‌ها',
    herop: 'پرونده را پیدا کن، پروژه را باز کن و مستقیم تسک یا فایل اضافه کن.',
    guide1: 'پرونده را پیدا کن',
    guide2: 'پروژه را باز کن',
    guide3: 'تسک یا فایل اضافه کن',
    tabTasks: 'تسک‌ها',
    tabFiles: 'فایل‌ها',
    tabInfo: 'جزئیات',
    infoHint: 'از این بخش می‌توانی وضعیت، لینک و درصد پیشرفت پروژه را تغییر بدهی.'
  });

  let currentTab = 'tasks';
  S.open.clear();

  function icon(name) {
    return typeof uiIcon === 'function' ? uiIcon(name) : '';
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function addGuide() {
    const hero = document.querySelector('.hero');
    if (!hero || document.querySelector('.simple-guide')) return;
    hero.insertAdjacentHTML('afterend', `
      <section class="simple-guide" aria-label="Workflow">
        <div class="simple-guide-item"><b>1</b><span data-simple="guide1"></span></div>
        <div class="simple-guide-item"><b>2</b><span data-simple="guide2"></span></div>
        <div class="simple-guide-item"><b>3</b><span data-simple="guide3"></span></div>
      </section>
    `);
  }

  function updateSimpleTexts() {
    document.querySelectorAll('[data-simple]').forEach(element => {
      setText(element, tr(element.dataset.simple));
    });

    const labels = {
      tasks: tr('tabTasks'),
      files: tr('tabFiles'),
      info: tr('tabInfo')
    };

    document.querySelectorAll('.simple-tab').forEach(button => {
      setText(button.querySelector('span'), labels[button.dataset.tab] || '');
    });
    setText(document.querySelector('.simple-info-note'), tr('infoHint'));
  }

  function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.simple-tab').forEach(button => {
      button.classList.toggle('on', button.dataset.tab === tab);
    });
    document.querySelectorAll('.simple-tab-panel').forEach(panel => {
      panel.hidden = panel.dataset.panel !== tab;
    });
  }

  function buildProjectTabs() {
    const panel = document.querySelector('.panel');
    const header = panel?.querySelector('.dh');
    const tasks = panel?.querySelector('.tasks');
    const assets = panel?.querySelector('#assetsSection');
    const toolbar = panel?.querySelector('.toolbar');
    const settings = panel?.querySelector('.settings');
    if (!panel || !header || !tasks || !toolbar || !settings) return false;

    let tabs = panel.querySelector('.simple-tabs');
    if (!tabs) {
      tabs = document.createElement('nav');
      tabs.className = 'simple-tabs';
      tabs.innerHTML = `
        <button class="simple-tab on" type="button" data-tab="tasks">${icon('checkcircle')}<span></span></button>
        <button class="simple-tab" type="button" data-tab="files">${icon('folders')}<span></span></button>
        <button class="simple-tab" type="button" data-tab="info">${icon('settings') || icon('internal')}<span></span></button>
      `;
      header.insertAdjacentElement('afterend', tabs);
      tabs.querySelectorAll('.simple-tab').forEach(button => {
        button.onclick = () => showTab(button.dataset.tab);
      });
    }

    tasks.classList.add('simple-tab-panel');
    tasks.dataset.panel = 'tasks';

    if (assets) {
      assets.classList.add('simple-tab-panel');
      assets.dataset.panel = 'files';
    }

    let infoPanel = panel.querySelector('[data-panel="info"]');
    if (!infoPanel) {
      infoPanel = document.createElement('section');
      infoPanel.className = 'simple-tab-panel';
      infoPanel.dataset.panel = 'info';
      infoPanel.innerHTML = '<div class="simple-info-note"></div>';
      infoPanel.append(toolbar, settings);
      tabs.insertAdjacentElement('afterend', infoPanel);
    }

    updateSimpleTexts();
    showTab(currentTab);
    return true;
  }

  addGuide();

  const originalRenderDrawer = renderDrawer;
  renderDrawer = function () {
    originalRenderDrawer();
    buildProjectTabs();
    showTab(currentTab);
  };

  const originalOpenProject = openProject;
  openProject = function (id) {
    currentTab = 'tasks';
    originalOpenProject(id);
    buildProjectTabs();
    showTab('tasks');
  };

  const originalI18n = i18n;
  i18n = function () {
    originalI18n();
    updateSimpleTexts();
  };

  const originalRender = render;
  render = function () {
    originalRender();
    addGuide();
    buildProjectTabs();
    updateSimpleTexts();
  };

  [0, 250, 1000].forEach(delay => setTimeout(() => {
    addGuide();
    buildProjectTabs();
    updateSimpleTexts();
  }, delay));
})();