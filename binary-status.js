/* A+ Works — project state is derived only from open tasks */
(() => {
  Object.assign(L.de, {
    hasOpenTasks: 'Offene Aufgaben',
    noOpenTasksState: 'Keine offenen Aufgaben',
    oneOpenTask: '1 offene Aufgabe',
    manyOpenTasks: 'offene Aufgaben',
    infoHint: 'Hier kannst du nur den Projekt-Link ändern.'
  });

  Object.assign(L.fa, {
    hasOpenTasks: 'تسک باز دارد',
    noOpenTasksState: 'تسک باز ندارد',
    oneOpenTask: '۱ تسک باز',
    manyOpenTasks: 'تسک باز',
    infoHint: 'اینجا فقط می‌توانی لینک پروژه را تغییر بدهی.'
  });

  const style = document.createElement('style');
  style.textContent = `
    /* No manual project status or progress controls */
    #status,
    #prog,
    #progo,
    #pm-status,
    #pm-progress,
    #pm-progress-out{display:none!important}

    #prog.closest-label-placeholder{display:none}

    .binary-project-state{
      display:inline-flex;
      align-items:center;
      gap:7px;
      min-height:38px;
      padding:8px 11px;
      border-radius:11px;
      font-size:12px;
      font-weight:850;
      white-space:nowrap;
      background:#f1f3f7;
      color:var(--muted);
    }
    .binary-project-state:before{
      content:'';
      width:8px;
      height:8px;
      border-radius:50%;
      background:#9aa3b5;
    }
    .binary-project-state.has-open{
      background:#fff4e5;
      color:#a66b17;
    }
    .binary-project-state.has-open:before{background:#e29a2f}
    .binary-project-state.no-open{
      background:#edf8f3;
      color:#378263;
    }
    .binary-project-state.no-open:before{background:#4ca780}

    body.simple-mode .status.has-open{
      color:#a66b17!important;
      background:#fff4e5!important;
    }
    body.simple-mode .status.no-open{
      color:#378263!important;
      background:#edf8f3!important;
    }
    body.simple-mode .toolbar{
      display:grid!important;
      grid-template-columns:auto 1fr;
      gap:9px;
      align-items:center;
    }
    body.simple-mode .toolbar #plink{width:100%;text-align:center}
    body.simple-mode .edit{grid-template-columns:1fr auto!important}
    body.simple-mode .edit label:has(#prog){display:none!important}
    .project-form label:has(#pm-status),
    .project-form label:has(#pm-progress){display:none!important}
    .project-form-grid{grid-template-columns:1fr!important}

    @media(max-width:760px){
      body.simple-mode .toolbar{grid-template-columns:1fr}
      .binary-project-state{justify-content:center}
    }
  `;
  document.head.append(style);

  function openTaskCount(projectId) {
    if (!S.data) return 0;
    return S.data.tasks.filter(task => +task.project_id === +projectId && !+task.completed).length;
  }

  function stateText(count) {
    if (!count) return tr('noOpenTasksState');
    if (S.lang === 'fa') return `${count.toLocaleString('fa-IR')} ${tr('manyOpenTasks')}`;
    return count === 1 ? tr('oneOpenTask') : `${count} ${tr('manyOpenTasks')}`;
  }

  function applyStateBadge(element, count) {
    if (!element) return;
    element.textContent = count ? tr('hasOpenTasks') : tr('noOpenTasksState');
    element.classList.remove('idea','demo','planning','in_progress','review','live','maintenance','paused','done','has-open','no-open');
    element.classList.add(count ? 'has-open' : 'no-open');
  }

  function simplifyProjectCards() {
    if (!S.data) return;
    const accounts = visible();

    document.querySelectorAll('.account').forEach((card, accountIndex) => {
      const account = accounts[accountIndex];
      if (!account) return;

      const projects = S.data.projects
        .filter(project => +project.account_id === +account.id)
        .sort((a, b) => (+a.sort_order || 0) - (+b.sort_order || 0));

      card.querySelectorAll('.project').forEach((row, projectIndex) => {
        const project = projects[projectIndex];
        if (!project) return;
        const count = openTaskCount(project.id);
        const subtitle = row.querySelector('.pt small');
        if (subtitle) subtitle.textContent = stateText(count);
        applyStateBadge(row.querySelector('.status'), count);
      });
    });
  }

  function simplifyDrawer() {
    if (!S.data || !S.project) return;
    const project = S.data.projects.find(item => +item.id === +S.project);
    if (!project) return;

    const toolbar = document.querySelector('.panel .toolbar');
    const projectLink = document.querySelector('#plink');
    const count = openTaskCount(project.id);

    if (toolbar) {
      let state = toolbar.querySelector('.binary-project-state');
      if (!state) {
        state = document.createElement('div');
        state.className = 'binary-project-state';
        toolbar.insertBefore(state, projectLink || toolbar.firstChild);
      }
      state.textContent = count ? tr('hasOpenTasks') : tr('noOpenTasksState');
      state.classList.toggle('has-open', count > 0);
      state.classList.toggle('no-open', count === 0);
    }

    const progressLabel = document.querySelector('#prog')?.closest('label');
    if (progressLabel) progressLabel.hidden = true;
    const statusControl = document.querySelector('#status');
    if (statusControl) statusControl.hidden = true;
  }

  function simplifyProjectForm() {
    const status = document.querySelector('#pm-status');
    const progress = document.querySelector('#pm-progress');
    if (status) {
      status.value = 'in_progress';
      const label = status.closest('label');
      if (label) label.hidden = true;
    }
    if (progress) {
      progress.value = '0';
      const label = progress.closest('label');
      if (label) label.hidden = true;
    }
  }

  /* Ignore legacy manual status/progress updates. */
  const previousProjectPatch = projectPatch;
  projectPatch = function (patch) {
    const clean = { ...patch };
    delete clean.status;
    delete clean.progress;
    if (!Object.keys(clean).length) return Promise.resolve();
    return previousProjectPatch(clean);
  };

  const previousRenderGrid = renderGrid;
  renderGrid = function () {
    previousRenderGrid();
    simplifyProjectCards();
  };

  const previousRenderDrawer = renderDrawer;
  renderDrawer = function () {
    previousRenderDrawer();
    simplifyDrawer();
  };

  const previousRender = render;
  render = function () {
    previousRender();
    simplifyProjectCards();
    simplifyDrawer();
    simplifyProjectForm();
  };

  const previousI18n = i18n;
  i18n = function () {
    previousI18n();
    simplifyProjectCards();
    simplifyDrawer();
  };

  [0, 250, 900].forEach(delay => setTimeout(() => {
    simplifyProjectCards();
    simplifyDrawer();
    simplifyProjectForm();
  }, delay));
})();