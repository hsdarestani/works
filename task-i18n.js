/* A+ Works — show the saved Persian/German task translation automatically */
(() => {
  window.taskTitle = function taskTitle(task) {
    if (!task) return '';
    const original = task._original_title || task.title || '';
    return S.lang === 'fa'
      ? (task.title_fa || task.title_de || original)
      : (task.title_de || task.title_fa || original);
  };

  function applyTaskLanguage() {
    if (!S.data?.tasks) return;
    S.data.tasks.forEach(task => {
      if (!task._original_title) task._original_title = task.title || '';
      task.title = window.taskTitle(task);
    });
  }

  function refreshTaskTextInDom() {
    if (!S.data?.tasks) return;
    document.querySelectorAll('[data-task-id]').forEach(element => {
      const task = S.data.tasks.find(item => +item.id === +element.dataset.taskId);
      if (!task) return;
      const value = window.taskTitle(task);
      const titleElement = element.querySelector('.tasktitle, .open-task-title');
      if (titleElement) titleElement.textContent = value;
      const checkbox = element.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.setAttribute('aria-label', value);
    });
  }

  const previousRender = render;
  render = function () {
    applyTaskLanguage();
    previousRender();
    refreshTaskTextInDom();
  };

  const previousRenderTasks = renderTasks;
  renderTasks = function () {
    applyTaskLanguage();
    previousRenderTasks();
    refreshTaskTextInDom();
  };

  const previousI18n = i18n;
  i18n = function () {
    applyTaskLanguage();
    previousI18n();
    refreshTaskTextInDom();
  };

  [0, 300, 1200].forEach(delay => setTimeout(() => {
    applyTaskLanguage();
    refreshTaskTextInDom();
  }, delay));
})();