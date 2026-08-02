/* A+ Works — safe account and project deletion without overlapping counters */
(() => {
  Object.assign(L.de, {
    deleteAccount: 'Akte löschen',
    deleteProject: 'Projekt löschen',
    confirmDeleteAccount: 'Diese Akte und alle Projekte, Aufgaben und Kommentare darin löschen?',
    confirmDeleteProject: 'Dieses Projekt mit allen Aufgaben und Kommentaren löschen?',
    accountDeleted: 'Akte wurde gelöscht.',
    projectDeleted: 'Projekt wurde gelöscht.'
  });

  Object.assign(L.fa, {
    deleteAccount: 'حذف پرونده',
    deleteProject: 'حذف پروژه',
    confirmDeleteAccount: 'این پرونده همراه با همه پروژه‌ها، تسک‌ها و کامنت‌های داخلش حذف شود؟',
    confirmDeleteProject: 'این پروژه همراه با همه تسک‌ها و کامنت‌هایش حذف شود؟',
    accountDeleted: 'پرونده حذف شد.',
    projectDeleted: 'پروژه حذف شد.'
  });

  const style = document.createElement('style');
  style.textContent = `
    body.simple-mode .project{
      grid-template-columns:minmax(0,1fr) auto auto!important;
      align-items:center;
    }
    .account-actions{
      display:flex;
      justify-content:flex-end;
      padding:0 12px 9px;
      margin-top:-3px;
    }
    .delete-account,.delete-project{
      position:static!important;
      inset:auto!important;
      transform:none!important;
      width:30px;
      height:30px;
      flex:0 0 30px;
      border:0;
      border-radius:9px;
      display:grid;
      place-items:center;
      color:#9f5961;
      background:#fff1f2;
      cursor:pointer;
      opacity:.72;
      transition:.18s ease;
    }
    .delete-account:hover,.delete-project:hover{
      opacity:1;
      color:#fff;
      background:#c65360;
      transform:scale(1.04)!important;
    }
    .delete-account svg,.delete-project svg{width:14px;height:14px}
    @media(max-width:500px){
      .delete-account,.delete-project{opacity:1;width:29px;height:29px}
    }
  `;
  document.head.append(style);

  function trashIcon() {
    return typeof uiIcon === 'function' ? uiIcon('trash') : '×';
  }

  function removeProjectFromState(projectId) {
    const id = +projectId;
    const taskIds = S.data.tasks.filter(task => +task.project_id === id).map(task => +task.id);
    S.data.comments = S.data.comments.filter(comment => !taskIds.includes(+comment.task_id));
    S.data.tasks = S.data.tasks.filter(task => +task.project_id !== id);
    if (Array.isArray(S.data.assets)) {
      S.data.assets = S.data.assets.filter(asset => +asset.project_id !== id);
    }
    S.data.projects = S.data.projects.filter(project => +project.id !== id);
    if (+S.project === id) {
      S.project = null;
      $('#drawer')?.classList.remove('open');
    }
  }

  function removeAccountFromState(accountId) {
    const id = +accountId;
    const projectIds = S.data.projects.filter(project => +project.account_id === id).map(project => +project.id);
    const taskIds = S.data.tasks.filter(task => projectIds.includes(+task.project_id)).map(task => +task.id);

    S.data.comments = S.data.comments.filter(comment => !taskIds.includes(+comment.task_id));
    S.data.tasks = S.data.tasks.filter(task => !projectIds.includes(+task.project_id));
    if (Array.isArray(S.data.assets)) {
      S.data.assets = S.data.assets.filter(asset => !projectIds.includes(+asset.project_id));
    }
    S.data.projects = S.data.projects.filter(project => +project.account_id !== id);
    S.data.accounts = S.data.accounts.filter(account => +account.id !== id);
    S.open.delete(id);

    if (S.project && projectIds.includes(+S.project)) {
      S.project = null;
      $('#drawer')?.classList.remove('open');
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(tr('confirmDeleteProject'))) return;
    try {
      if (S.mode === 'remote') await api(`projects/${project.id}`, { method: 'DELETE' });
      removeProjectFromState(project.id);
      if (S.mode === 'local') save();
      render();
      toast(tr('projectDeleted'));
    } catch (error) {
      toast(error.message || tr('err'));
    }
  }

  async function deleteAccount(account) {
    if (!window.confirm(tr('confirmDeleteAccount'))) return;
    try {
      if (S.mode === 'remote') await api(`accounts/${account.id}`, { method: 'DELETE' });
      removeAccountFromState(account.id);
      if (S.mode === 'local') save();
      render();
      toast(tr('accountDeleted'));
    } catch (error) {
      toast(error.message || tr('err'));
    }
  }

  function makeDeleteButton(className, label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.innerHTML = trashIcon();
    button.title = label;
    button.setAttribute('aria-label', label);
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    };
    return button;
  }

  function addDeleteControls() {
    if (!S.data) return;
    const accounts = visible();

    $$('.account').forEach((card, accountIndex) => {
      const account = accounts[accountIndex];
      if (!account) return;

      if (!card.querySelector('.account-actions')) {
        const actions = document.createElement('div');
        actions.className = 'account-actions';
        actions.append(makeDeleteButton('delete-account', tr('deleteAccount'), () => deleteAccount(account)));
        const projectsBox = card.querySelector('.projects');
        card.insertBefore(actions, projectsBox || null);
      }

      const projects = S.data.projects
        .filter(project => +project.account_id === +account.id)
        .sort((a, b) => (+a.sort_order || 0) - (+b.sort_order || 0));

      card.querySelectorAll('.project').forEach((row, projectIndex) => {
        const project = projects[projectIndex];
        if (!project || row.querySelector('.delete-project')) return;
        row.append(makeDeleteButton('delete-project', tr('deleteProject'), () => deleteProject(project)));
      });
    });
  }

  const originalRenderGrid = renderGrid;
  renderGrid = function () {
    originalRenderGrid();
    addDeleteControls();
  };

  const originalI18n = i18n;
  i18n = function () {
    originalI18n();
    addDeleteControls();
  };

  [0, 300, 1000].forEach(delay => setTimeout(addDeleteControls, delay));
})();