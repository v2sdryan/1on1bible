const STORAGE_KEY = 'bible-reading-progress-v1';
const SETTINGS_KEY = 'bible-reading-settings-v1';
const appRoot = document.getElementById('app');
const sectionNav = document.getElementById('sectionNav');
const sectionCount = document.getElementById('sectionCount');
const overallPercent = document.getElementById('overallPercent');
const overallFill = document.getElementById('overallFill');
const overallSummary = document.getElementById('overallSummary');
const itemsPerDayInput = document.getElementById('itemsPerDay');
const itemsPerDayValue = document.getElementById('itemsPerDayValue');
const resetButton = document.getElementById('resetProgress');

const defaultPlan = {
  title: 'Bible Reading Tracker',
  subtitle: '按 PDF 順序分日閱讀，完成後用 checkbox 標記。',
  intro: [],
  sections: [
    {
      id: 'section-1',
      title: 'Section 1',
      source: 'PDF order',
      items: [],
    },
  ],
};

const plan = window.READING_PLAN || defaultPlan;
const state = {
  itemsPerDay: readSetting('itemsPerDay', 4),
  progress: readProgress(),
  route: getRoute(),
};

itemsPerDayInput.value = String(state.itemsPerDay);
itemsPerDayValue.textContent = String(state.itemsPerDay);

itemsPerDayInput.addEventListener('input', () => {
  state.itemsPerDay = Number(itemsPerDayInput.value);
  itemsPerDayValue.textContent = String(state.itemsPerDay);
  saveSetting('itemsPerDay', state.itemsPerDay);
  render();
});

resetButton.addEventListener('click', () => {
  state.progress = {};
  localStorage.removeItem(STORAGE_KEY);
  render();
});

window.addEventListener('hashchange', () => {
  state.route = getRoute();
  render();
});

function readSetting(key, fallback) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return typeof parsed[key] === 'number' ? parsed[key] : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key, value) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
}

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  } catch {
    // ignore storage errors
  }
}

function getRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash || hash === 'home') {
    return { view: 'home' };
  }

  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'section') {
    const sectionIndex = Number(parts[1] || 0);
    const dayIndex = parts[2] === 'day' ? Number(parts[3] || 1) : null;
    const itemIndex = parts[4] === 'item' ? Number(parts[5] || 1) : null;
    return {
      view: itemIndex ? 'item' : dayIndex ? 'day' : 'section',
      sectionIndex,
      dayIndex,
      itemIndex,
    };
  }

  return { view: 'home' };
}

function flattenSection(section) {
  return section.items.map((item, index) => ({
    id: `${section.id}-${index + 1}`,
    sectionId: section.id,
    sectionTitle: section.title,
    source: section.source || 'PDF order',
    index: index + 1,
    text: item,
  }));
}

function chunkItems(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function isChecked(itemId) {
  return Boolean(state.progress[itemId]);
}

function setChecked(itemId, checked) {
  state.progress[itemId] = checked;
  if (!checked) {
    delete state.progress[itemId];
  }
  saveProgress();
  render();
}

function toggleHash(path) {
  window.location.hash = path;
}

function currentSection() {
  return plan.sections[state.route.sectionIndex] || plan.sections[0];
}

function sectionStats(section) {
  const items = flattenSection(section);
  const completed = items.filter((item) => isChecked(item.id)).length;
  const total = items.length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

function overallStats() {
  const allItems = plan.sections.flatMap((section) => flattenSection(section));
  const completed = allItems.filter((item) => isChecked(item.id)).length;
  const total = allItems.length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

function sectionLink(section, index) {
  const stats = sectionStats(section);
  return `
    <a class="section-link ${index === state.route.sectionIndex ? 'active' : ''}" href="#/section/${index}">
      <strong>${escapeHtml(section.title)}</strong>
      <span>${stats.completed}/${stats.total} read · ${stats.percent}%</span>
    </a>
  `;
}

function pageShell(mainContent) {
  const intro = plan.intro && plan.intro.length
    ? `
      <section class="hero section-card">
        <div>
          <p class="eyebrow">Reading flow</p>
          <h2 class="hero-title">${escapeHtml(plan.title || 'Bible Reading Tracker')}</h2>
          <p class="section-subtitle">${escapeHtml(plan.subtitle || '按 PDF 順序分日閱讀，完成後用 checkbox 標記。')}</p>
        </div>
        <div class="hero-grid">
          <div class="metric">
            <strong>${plan.sections.length}</strong>
            <span>sections</span>
          </div>
          <div class="metric">
            <strong>${state.itemsPerDay}</strong>
            <span>items per day</span>
          </div>
          <div class="metric">
            <strong>${overallStats().percent}%</strong>
            <span>complete</span>
          </div>
        </div>
        <div class="notice">
          PDF text extraction can be edited later if you want cleaner chapter labels. The current app keeps the sequence and progress.
        </div>
      </section>
    `
    : '';

  return `
    ${intro}
    ${mainContent}
  `;
}

function renderHome() {
  const sectionsHtml = plan.sections.map((section, index) => {
    const stats = sectionStats(section);
    return `
      <article class="section-card">
        <div class="section-top">
          <div>
            <p class="eyebrow">${escapeHtml(section.source || 'PDF order')}</p>
            <h3>${escapeHtml(section.title)}</h3>
            <p class="section-subtitle">${stats.total} items in sequence · split into days with the slider</p>
          </div>
          <a class="primary-button" href="#/section/${index}">Open</a>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
        <div class="meta-row">
          <span class="muted">${stats.completed} completed</span>
          <span class="muted">${stats.percent}%</span>
        </div>
      </article>
    `;
  }).join('');

  appRoot.innerHTML = pageShell(`
    <section class="section-card">
      <div class="section-top">
        <div>
          <p class="eyebrow">Overview</p>
          <h3>Choose a section</h3>
          <p class="section-subtitle">The app keeps the PDF order, chunks it into daily reading sets, and remembers every checkbox in localStorage.</p>
        </div>
      </div>
      <div class="day-grid">
        ${sectionsHtml}
      </div>
    </section>
  `);
}

function renderSection(sectionIndex) {
  const section = plan.sections[sectionIndex] || plan.sections[0];
  const items = flattenSection(section);
  const days = chunkItems(items, state.itemsPerDay);
  const stats = sectionStats(section);

  const dayLinks = days.map((dayItems, index) => {
    const dayNumber = index + 1;
    const completed = dayItems.filter((item) => isChecked(item.id)).length;
    const percent = dayItems.length ? Math.round((completed / dayItems.length) * 100) : 0;
    return `
      <a class="day-chip" href="#/section/${sectionIndex}/day/${dayNumber}">
        Day ${dayNumber} · ${completed}/${dayItems.length} · ${percent}%
      </a>
    `;
  }).join('');

  appRoot.innerHTML = pageShell(`
    <section class="section-card">
      <div class="section-top">
        <div>
          <p class="eyebrow">${escapeHtml(section.source || 'PDF order')}</p>
          <h3>${escapeHtml(section.title)}</h3>
          <p class="section-subtitle">${stats.total} items · ${days.length} days with the current setting</p>
        </div>
        <a class="ghost-button" href="#home">Back</a>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${stats.percent}%"></div></div>
      <div class="reader-nav">${dayLinks}</div>
      <div class="notice">Open any day to read the items one by one. Each day has its own subpage.</div>
      <div class="day-grid">
        ${days
          .map((dayItems, index) => renderDayCard(sectionIndex, index + 1, dayItems, false))
          .join('')}
      </div>
    </section>
  `);
}

function renderDayCard(sectionIndex, dayNumber, dayItems, current) {
  const completed = dayItems.filter((item) => isChecked(item.id)).length;
  const percent = dayItems.length ? Math.round((completed / dayItems.length) * 100) : 0;
  return `
    <article class="day-card ${current ? 'current' : ''}">
      <div class="day-top">
        <div>
          <span class="day-chip">Day ${dayNumber}</span>
          <h3>${completed === dayItems.length && dayItems.length ? 'Completed' : 'Keep going'}</h3>
          <p class="section-subtitle">${completed}/${dayItems.length} read · ${percent}%</p>
        </div>
        <a class="primary-button" href="#/section/${sectionIndex}/day/${dayNumber}">Open day</a>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div>
      <div class="item-grid">
        ${dayItems
          .map((item) => `
            <article class="item-card">
              <div class="item-row">
                <strong>Item ${item.index}</strong>
                <span class="tag">${isChecked(item.id) ? 'Read' : 'Unread'}</span>
              </div>
              <p class="item-title">${escapeHtml(item.text)}</p>
              <label class="check-row">
                <input type="checkbox" ${isChecked(item.id) ? 'checked' : ''} data-item-id="${item.id}" />
                Mark as read
              </label>
              <a class="ghost-button" href="#/section/${sectionIndex}/day/${dayNumber}/item/${item.index}">Open subpage</a>
            </article>
          `)
          .join('')}
      </div>
    </article>
  `;
}

function renderDay(sectionIndex, dayNumber) {
  const section = plan.sections[sectionIndex] || plan.sections[0];
  const items = flattenSection(section);
  const days = chunkItems(items, state.itemsPerDay);
  const dayItems = days[dayNumber - 1] || [];
  const completed = dayItems.filter((item) => isChecked(item.id)).length;
  const percent = dayItems.length ? Math.round((completed / dayItems.length) * 100) : 0;

  appRoot.innerHTML = pageShell(`
    <section class="day-card current">
      <div class="day-top">
        <div>
          <span class="day-chip">Day ${dayNumber}</span>
          <h3>${escapeHtml(section.title)}</h3>
          <p class="section-subtitle">${completed}/${dayItems.length} read · ${percent}% complete</p>
        </div>
        <a class="ghost-button" href="#/section/${sectionIndex}">Back to section</a>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div>
      <div class="day-grid">
        ${dayItems
          .map((item) => `
            <article class="item-card ${isChecked(item.id) ? 'current' : ''}">
              <div class="item-row">
                <strong>Item ${item.index}</strong>
                <span class="tag">${isChecked(item.id) ? 'Read' : 'Unread'}</span>
              </div>
              <p class="item-title">${escapeHtml(item.text)}</p>
              <p class="item-source">${escapeHtml(item.source)}</p>
              <label class="check-row">
                <input type="checkbox" ${isChecked(item.id) ? 'checked' : ''} data-item-id="${item.id}" />
                I have read this item
              </label>
              <a class="primary-button" href="#/section/${sectionIndex}/day/${dayNumber}/item/${item.index}">Open subpage</a>
            </article>
          `)
          .join('')}
      </div>
    </section>
  `);

  bindCheckboxes();
}

function renderItem(sectionIndex, dayNumber, itemNumber) {
  const section = plan.sections[sectionIndex] || plan.sections[0];
  const items = flattenSection(section);
  const days = chunkItems(items, state.itemsPerDay);
  const dayItems = days[dayNumber - 1] || [];
  const item = dayItems[itemNumber - 1] || dayItems[0] || items[0];

  if (!item) {
    renderHome();
    return;
  }

  const globalIndex = items.findIndex((entry) => entry.id === item.id);
  const prevItem = items[globalIndex - 1];
  const nextItem = items[globalIndex + 1];

  appRoot.innerHTML = pageShell(`
    <article class="reader-card">
      <div class="reader-header">
        <div>
          <span class="day-chip">Day ${dayNumber} · Item ${itemNumber}</span>
          <h3>${escapeHtml(section.title)}</h3>
          <p class="section-subtitle">Subpage for focused reading and progress tracking.</p>
        </div>
        <a class="ghost-button" href="#/section/${sectionIndex}/day/${dayNumber}">Back to day</a>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${isChecked(item.id) ? '100%' : '0%'}"></div></div>
      <p class="reader-copy">${escapeHtml(item.text)}</p>
      <p class="muted">${escapeHtml(item.source)}</p>
      <label class="check-row">
        <input type="checkbox" ${isChecked(item.id) ? 'checked' : ''} data-item-id="${item.id}" />
        Mark this subpage as read
      </label>
      <div class="reader-nav">
        ${prevItem ? `<a class="ghost-button" href="#/section/${sectionIndex}/day/${dayNumber}/item/${Math.max(1, itemNumber - 1)}">Previous</a>` : ''}
        ${nextItem ? `<a class="ghost-button" href="#/section/${sectionIndex}/day/${dayNumber}/item/${itemNumber + 1}">Next</a>` : ''}
      </div>
    </article>
  `);

  bindCheckboxes();
}

function bindCheckboxes() {
  document.querySelectorAll('input[type="checkbox"][data-item-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const target = event.currentTarget;
      setChecked(target.dataset.itemId, target.checked);
    });
  });
}

function renderSidebar() {
  sectionCount.textContent = String(plan.sections.length);
  sectionNav.innerHTML = plan.sections.map((section, index) => sectionLink(section, index)).join('');

  const stats = overallStats();
  overallPercent.textContent = `${stats.percent}%`;
  overallFill.style.width = `${stats.percent}%`;
  overallSummary.textContent = `${stats.completed} of ${stats.total} items read`;
}

function render() {
  renderSidebar();
  const route = state.route;

  if (route.view === 'section') {
    renderSection(route.sectionIndex || 0);
    return;
  }

  if (route.view === 'day') {
    renderDay(route.sectionIndex || 0, route.dayIndex || 1);
    return;
  }

  if (route.view === 'item') {
    renderItem(route.sectionIndex || 0, route.dayIndex || 1, route.itemIndex || 1);
    return;
  }

  renderHome();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

render();
