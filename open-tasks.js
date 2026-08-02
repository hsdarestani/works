/* A+ Works — open work view, grouped by customer and project */
(() => {
  Object.assign(L.de, {
    filesView: 'Akten',
    openTasksView: 'Offene Aufgaben',
    noOpenTasks: 'Keine offenen Aufgaben.',
    noOpenProjectTasks: 'Für dieses Projekt gibt es keine offenen Aufgaben.'
  });
  Object.assign(L.fa, {
    filesView: 'پرونده‌ها',
    openTasksView: 'تسک‌های باز',
    noOpenTasks: 'تسک بازی وجود ندارد.',
    noOpenProjectTasks: 'برای این پروژه تسک بازی وجود ندارد.'
  });

  let activeView = localStorage.worksActiveView || 'accounts';

  function icon(name, fallback = '') {
    return typeof uiIcon === 'function' ? (uiIcon(name) || fallback) : fallback;
  }

  function setupViews() {
    const main = document.querySelector('main');
    const metricsSection = document.querySelector('.metrics');
    const filtersSection = document.querySelector('.filters');
    const gridSection = document.querySelector('#grid');
    const emptySection = document.querySelector('#empty');
    if (!main || !metricsSection || !filtersSection || !gridSection || !emptySection) return;

    const doneMetric = document.querySelector('#dc')?.closest('.metric');
    if (doneMetric) doneMetric.classList.add('done-metric-hidden');

    let accountsView = document.querySelector('#accountsDashboardView');
    if (!accountsView) {
      accountsView = document.createElement('section');
      accountsView.id = 'accountsDashboardView';
      accountsView.className = 'dashboard-view';
      metricsSection.insertAdjacentElement('beforebegin', accountsView);
      accountsView.append(metricsSection, filtersSection, gridSection, emptySection);
    }

    let switcher = document.querySelector('#dashboardViewSwitch');
    if (!switcher) {
      switcher = document.createElement('nav');
      switcher.id = 'dashboardViewSwitch';
      switcher.className = 'view-switch';
      switcher.innerHTML = `
        <button type="button" data-view="accounts">${icon('folders')}<span></span></button>
        <button type="button" data-view="tasks">${icon('checkcircle')}<span></span></button>
      `;
      accountsView.insertAdjacentElement('beforebegin', switcher);
      switcher.querySelectorAll('button').forEach(button => {
        button.onclick = () => setView(button.dataset.view);
      });
    }

    let tasksView = document.querySelector('#openTasksDashboardView');
    if (!tasksView) {
      tasksView = document.createElement('section');
      tasksView.id = 'openTasksDashboardView';
      tasksView.className = 'dashboard-view open-tasks-view';
      tasksView.innerHTML = '<div class="open-tasks-list" id="openTasksList"></div><div class="open-tasks-empty" id="openTasksEmpty" hidden></div>';
      accountsView.insertAdjacentElement('afterend', tasksView);
    }

    updateViewText();
    applyView();
  }

  function updateViewText() {
    const accountsButton = document.querySelector('[data-view="accounts"] span');
    const tasksButton = document.querySelector('[data-view="tasks"] span');
    if (accountsButton) accountsButton.textContent = tr('filesView');
    if (tasksButton) tasksButton.textContent = tr('openTasksView');
    const empty = document.querySelector('#openTasksEmpty');
    if (empty) empty.textContent = tr('noOpenTasks');
  }

  function setView(view) {
    activeView = view === 'tasks' ? 'tasks' : 'accounts';
    localStorage.worksActiveView = activeView;
    applyView();
    if (activeView === 'tasks') renderOpenTasks();
  }

  function applyView() {
    const accountsView = document.querySelector('#accountsDashboardView');
    const tasksView = document.querySelector('#openTasksDashboardView');
    if (!accountsView || !tasksView) return;

    accountsView.hidden = activeView !== 'accounts';
    tasksView.hidden = activeView !== 'tasks';
    document.querySelectorAll('#dashboardViewSwitch button').forEach(button => {
      button.classList.toggle('on', button.dataset.view === activeView);
    });
  }

  function projectLabel(project) {
    return title(project);
  }

  function accountLabel(account) {
    return name(account);
  }

  function matchingOpenTasks() {
    if (!S.data) return [];
    const query = String(S.q || '').trim().toLowerCase();
    return S.data.tasks.filter(task => {
      if (+task.completed) return false;
      const project = S.data.projects.find(item => +item.id === +task.project_id);
      if (!project) return false;
      const account = S.data.accounts.find(item => +item.id === +project.account_id);
      if (!account) return false;
      if (!query) return true;
      return [task.title, project.title_de, project.title_fa, account.name, account.name_fa]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }

  function renderOpenTasks() {
    const list = document.querySelector('#openTasksList');
    const empty = document.querySelector('#openTasksEmpty');
    if (!list || !empty || !S.data) return;

    const tasks = matchingOpenTasks();
    const groups = new Map();

    tasks.forEach(task => {
      const project = S.data.projects.find(item => +item.id === +task.project_id);
      const account = S.data.accounts.find(item => +item.id === +project.account_id);
      if (!groups.has(+project.id)) groups.set(+project.id, { project, account, tasks: [] });
      groups.get(+project.id).tasks.push(task);
    });

    const orderedGroups = [...groups.values()].sort((a, b) => {
      const accountOrder = (+a.account.sort_order || 0) - (+b.account.sort_order || 0);
      if (accountOrder) return accountOrder;
      return (+a.project.sort_order || 0) - (+b.project.sort_order || 0);
    });

    list.innerHTML = '';
    empty.hidden = orderedGroups.length > 0;

    orderedGroups.forEach(group => {
      const card = document.createElement('article');
      card.className = 'open-project-card';
      card.innerHTML = `
        <button class="open-project-head" type="button">
          <span class="open-project-icon">${icon(group.project.kind, icon('checkcircle'))}</span>
          <span class="open-project-copy">
            <b>${projectLabel(group.project)}</b>
            <small>${accountLabel(group.account)}</small>
          </span>
          <span class="open-task-count">${group.tasks.length}</span>
        </button>
        <div class="open-task-items"></div>
      `;
      card.querySelector('.open-project-head').onclick = () => openProject(group.project.id);

      const items = card.querySelector('.open-task-items');
      group.tasks.forEach(task => {
        const row = document.createElement('div');
        row.className = 'open-task-row';
        const commentCount = S.data.comments.filter(comment => +comment.task_id === +task.id).length;
        row.innerHTML = `
          <input class="open-task-check" type="checkbox" aria-label="${task.title}">
          <span class="open-task-title">${task.title}</span>
          <span class="open-task-comments">${commentCount ? `💬 ${commentCount}` : ''}</span>
        `;
        row.querySelector('.open-task-check').onchange = async event => {
          if (!event.target.checked) return;
          event.target.disabled = true;
          try {
            await taskPatch(task.id, { completed: 1 });
            render();
          } catch (error) {
            event.target.checked = false;
            event.target.disabled = false;
            toast(error.message || tr('err'));
          }
        };
        row.querySelector('.open-task-title').onclick = () => openProject(group.project.id);
        items.append(row);
      });
      list.append(card);
    });
  }

  /* Only active tasks are shown inside a project. Completed items are archived. */
  renderTasks = function () {
    const list = $('#tasklist');
    const tasks = S.data.tasks
      .filter(task => +task.project_id === +S.project && !+task.completed)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    $('#taskhead').textContent = `${tr('tasks')} · ${tasks.length} ${tr('open')}`;
    list.innerHTML = '';

    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'no-open-project-tasks';
      empty.textContent = tr('noOpenProjectTasks');
      list.append(empty);
      return;
    }

    tasks.forEach(task => {
      const taskCommentList = taskComments(task.id);
      const element = document.createElement('article');
      element.className = 'task soft';
      element.dataset.taskId = task.id;
      element.innerHTML = `
        <div class="taskmain">
          <input type="checkbox">
          <div><span class="tasktitle">${task.title}</span><small class="taskmeta">${task.created_by || 'Hossein'}</small></div>
          <button class="ctoggle">💬 ${taskCommentList.length}</button>
        </div>
        <div class="comments" hidden>
          <div class="commentlist"></div>
          <form class="commentform inset"><textarea required placeholder="${tr('write')}"></textarea><button class="secondary">${tr('send')}</button></form>
        </div>
      `;

      element.querySelector('input[type="checkbox"]').onchange = async event => {
        event.target.disabled = true;
        try {
          await taskPatch(task.id, { completed: 1 });
          render();
        } catch (error) {
          event.target.checked = false;
          event.target.disabled = false;
          toast(error.message || tr('err'));
        }
      };

      const commentPanel = element.querySelector('.comments');
      element.querySelector('.ctoggle').onclick = () => {
        commentPanel.hidden = !commentPanel.hidden;
        if (!commentPanel.hidden) comments(task.id, element.querySelector('.commentlist'));
      };

      element.querySelector('.commentform').onsubmit = async event => {
        event.preventDefault();
        const textarea = event.target.querySelector('textarea');
        const body = textarea.value.trim();
        if (!body) return;
        await addComment(task.id, null, body);
        renderTasks();
        const found = document.querySelector(`[data-task-id="${task.id}"]`);
        if (found) {
          found.querySelector('.comments').hidden = false;
          comments(task.id, found.querySelector('.commentlist'));
        }
      };
      list.append(element);
    });
  };

  const previousRender = render;
  render = function () {
    previousRender();
    setupViews();
    renderOpenTasks();
    applyView();
  };

  const previousI18n = i18n;
  i18n = function () {
    previousI18n();
    updateViewText();
    renderOpenTasks();
  };

  $('#search')?.addEventListener('input', () => {
    if (activeView === 'tasks') renderOpenTasks();
  });

  setupViews();
  renderOpenTasks();
})();