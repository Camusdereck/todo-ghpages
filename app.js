/* Application Todo — Vanilla JS + LocalStorage
   Accessibilité, filtrage, recherche, édition inline.
*/
(() => {
  'use strict';

  const el = {
    form: document.getElementById('add-form'),
    input: document.getElementById('todo-input'),
    due: document.getElementById('todo-due'),
    list: document.getElementById('todo-list'),
    search: document.getElementById('search'),
    filters: document.querySelector('.filters'),
    clearCompleted: document.getElementById('clear-completed'),
    counter: document.getElementById('left-counter'),
    chipAll: document.querySelector('[data-filter="all"]'),
    chipActive: document.querySelector('[data-filter="active"]'),
    chipCompleted: document.querySelector('[data-filter="completed"]'),
    template: document.getElementById('todo-item-template')
  };

  const STORAGE_KEY = 'todo-ghpages:v1';

  /** @type {{ id:string, text:string, completed:boolean, createdAt:number, due?:string }[]} */
  let todos = [];

  let ui = {
    filter: 'all', // 'all' | 'active' | 'completed'
    search: ''
  };

  // --- Utils ---
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const fmtDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(d);
    } catch { return iso; }
  };
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      todos = raw ? JSON.parse(raw) : [];
    } catch {
      todos = [];
    }
  };

  const setFilterChip = () => {
    for (const chip of document.querySelectorAll('.chip')) {
      chip.setAttribute('aria-selected', String(chip.dataset.filter === ui.filter));
    }
  };

  const filteredTodos = () => {
    const q = ui.search.trim().toLowerCase();
    return todos.filter(t => {
      const matchesText = !q || t.text.toLowerCase().includes(q);
      const matchesFilter =
        ui.filter === 'all' ? true :
        ui.filter === 'active' ? !t.completed :
        t.completed;
      return matchesText && matchesFilter;
    });
  };

  const render = () => {
    setFilterChip();

    const items = filteredTodos();
    el.list.innerHTML = '';

    for (const t of items) {
      const node = el.template.content.cloneNode(true);
      const li = node.querySelector('.todo-item');
      li.dataset.id = t.id;
      if (t.completed) li.classList.add('completed');

      const checkbox = node.querySelector('.toggle');
      const textSpan = node.querySelector('.text');
      const dueTime = node.querySelector('.due');
      const createdSpan = node.querySelector('.created');

      checkbox.checked = t.completed;
      textSpan.textContent = t.text;

      if (t.due) {
        dueTime.dateTime = t.due;
        dueTime.textContent = '⏰ ' + fmtDate(t.due);
      } else {
        dueTime.remove();
      }

      const created = new Date(t.createdAt);
      createdSpan.textContent = 'créé le ' + new Intl.DateTimeFormat('fr-FR', { day:'2-digit', month:'short' }).format(created);

      el.list.appendChild(node);
    }

    const left = todos.filter(t => !t.completed).length;
    el.counter.textContent = left + (left <= 1 ? ' tâche à faire' : ' tâches à faire');
  };

  // --- Actions ---
  const addTodo = (text, due) => {
    const t = {
      id: uid(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
      due: due || ''
    };
    todos.unshift(t);
    save();
    render();
  };

  const toggleTodo = (id, completed) => {
    const t = todos.find(x => x.id === id);
    if (t) {
      t.completed = completed;
      save(); render();
    }
  };

  const deleteTodo = (id) => {
    const i = todos.findIndex(x => x.id === id);
    if (i !== -1) {
      todos.splice(i, 1);
      save(); render();
    }
  };

  const updateTodoText = (id, newText) => {
    const t = todos.find(x => x.id === id);
    if (t && newText.trim()) {
      t.text = newText.trim();
      save(); render();
    }
  };

  const updateTodoDue = (id, newDue) => {
    const t = todos.find(x => x.id === id);
    if (t) {
      t.due = newDue || '';
      save(); render();
    }
  };

  const clearCompleted = () => {
    const before = todos.length;
    todos = todos.filter(t => !t.completed);
    if (todos.length !== before) {
      save(); render();
    }
  };

  // --- Events ---
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = el.input.value;
    const due = el.due.value;
    if (!text.trim()) return;
    addTodo(text, due);
    el.input.value = '';
    el.due.value = '';
    el.input.focus();
  });

  el.list.addEventListener('change', (e) => {
    const target = e.target;
    const li = target.closest('.todo-item');
    if (!li) return;
    const id = li.dataset.id;

    if (target.classList.contains('toggle')) {
      toggleTodo(id, target.checked);
    }
  });

  el.list.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    const li = e.target.closest('.todo-item');
    if (!li) return;
    const id = li.dataset.id;

    if (btn?.classList.contains('delete')) {
      deleteTodo(id);
    }

    if (btn?.classList.contains('edit')) {
      // Simple inline editor using prompt for reliability
      const t = todos.find(x => x.id === id);
      if (!t) return;
      const newText = window.prompt('Modifier la tâche :', t.text);
      if (newText !== null) updateTodoText(id, newText);

      const newDue = window.prompt('Modifier la date (YYYY-MM-DD) ou laissez vide :', t.due || '');
      if (newDue !== null) {
        const ok = !newDue || /^\d{4}-\d{2}-\d{2}$/.test(newDue);
        if (ok) updateTodoDue(id, newDue);
        else alert('Format invalide. Utilisez AAAA-MM-JJ.');
      }
    }
  });

  // Édition par double-clic
  el.list.addEventListener('dblclick', (e) => {
    const span = e.target.closest('.text');
    const li = e.target.closest('.todo-item');
    if (!span || !li) return;

    const id = li.dataset.id;
    span.contentEditable = 'true';
    span.focus();

    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = () => {
      span.contentEditable = 'false';
      const val = span.textContent || '';
      updateTodoText(id, val);
      span.removeEventListener('blur', finish);
      span.removeEventListener('keydown', onKey);
    };
    const onKey = (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(); }
      if (ev.key === 'Escape') { ev.preventDefault(); span.textContent = todos.find(t => t.id === id)?.text || ''; finish(); }
    };

    span.addEventListener('blur', finish);
    span.addEventListener('keydown', onKey);
  });

  el.search.addEventListener('input', (e) => {
    ui.search = e.target.value || '';
    render();
  });

  el.filters.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    ui.filter = b.dataset.filter;
    render();
  });

  el.clearCompleted.addEventListener('click', clearCompleted);

  // Keyboard shortcut: Ctrl/Cmd+K to focus search
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      el.search.focus();
    }
  });

  // Init
  load();
  render();
})();
