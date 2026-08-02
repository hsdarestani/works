/* A+ Works — delete duplicate accounts or projects safely */
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
    .account,.project{position:relative}
    .delete-account,.delete-project{
      position:absolute;
      z-index:6;
      width:30px;
      height:30px;
      border:0;
      border-radius:9px;
      display:grid;
      place-items:center;
      color:#a04c55;
      background:#fff4f5;
      cursor:pointer;
      opacity:.6;
      transition:.18s ease;
    }
    .delete-account:hover,.delete-project:hover{
      opacity:1;
      color:#fff;
      background:#c65360;
      transform:scale(1.04);
    }
    .delete-account{top:19px;right:54px}
    .delete-project{top:50%;right:43px;transform:translateY(-50%)}
    .delete-project:hover{transform:translateY(-50%) scale(1.04)}
    html[dir=rtl] .delete-account{right:auto;left:54px}
    html[dir=rtl] .delete-project{right:auto;left:43px}
    .delete-account svg,.delete-project svg{width:15px;height:15px}
    @media(max-width:760px){
      .delete-account,.delete-project{opacity:1}
      .delete-account{right:48px}
      html[dir=rtl] .delete-account{right:auto;left:48px}
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
      if (S.mode === 'remote') {
        await api(`projects/${project.id}`, { method: 'DELETE' });
      }
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
      if (S.mode === 'remote') {
        await api(`accounts/${account.id}`, { method: 'DELETE' });
      }
      removeAccountFromState(account.id);
      if (S.mode === 'local') save();
      render();
      toast(tr('accountDeleted'));
    } catch (error) {
      toast(error.message || tr('err'));
    }
  }

  function addDeleteControls() {
    if (!S.data) return;
    const accounts = visible();

    $$('.account').forEach((card, accountIndex) => {
      const account = accounts[accountIndex];
      if (!account) return;

      if (!card.querySelector('.delete-account')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'delete-account';
        button.innerHTML = trashIcon();
        button.title = tr('deleteAccount');
        button.setAttribute('aria-label', tr('deleteAccount'));
        button.onclick = event => {
          event.preventDefault();
          event.stopPropagation();
          deleteAccount(account);
        };
        card.append(button);
      }

      const projects = S.data.projects
        .filter(project => +project.account_id === +account.id)
        .sort((a, b) => (+a.sort_order || 0) - (+b.sort_order || 0));

      card.querySelectorAll('.project').forEach((row, projectIndex) => {
        const project = projects[projectIndex];
        if (!project || row.querySelector('.delete-project')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'delete-project';
        button.innerHTML = trashIcon();
        button.title = tr('deleteProject');
        button.setAttribute('aria-label', tr('deleteProject'));
        button.onclick = event => {
          event.preventDefault();
          event.stopPropagation();
          deleteProject(project);
        };
        row.append(button);
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