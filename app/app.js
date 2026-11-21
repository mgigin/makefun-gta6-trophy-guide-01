// Leonida Legend — offline GTA VI trophy guide and tracker.
// Loads app/data/trophies.json (the app's own file), renders a checklist of
// all 55 trophies with expandable cited guides, a roadmap view grouped by
// stage, filters, a story-spoiler setting, and progress that lives in
// localStorage with export/import as a JSON file. No network requests.

const STORAGE_KEY = 'leonida-legend-progress-v1';
const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

const state = {
  trophies: [],
  stages: [],
  earned: loadProgress(),
  openGuides: new Set(),
  view: 'checklist',
};

const els = {
  list: document.getElementById('trophy-list'),
  empty: document.getElementById('empty-message'),
  roadmap: document.getElementById('roadmap-list'),
  checklistView: document.getElementById('view-checklist'),
  roadmapView: document.getElementById('view-roadmap'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  progressGrades: document.getElementById('progress-grades'),
  visibleCount: document.getElementById('visible-count'),
  search: document.getElementById('filter-search'),
  kind: document.getElementById('filter-kind'),
  grade: document.getElementById('filter-grade'),
  status: document.getElementById('filter-status'),
  spoiler: document.getElementById('spoiler-toggle'),
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.earned].sort()));
}

function isSpoilerHidden(trophy) {
  return els.spoiler.checked && trophy.kind === 'story' && !state.earned.has(trophy.name);
}

function displayName(trophy) {
  return isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isSpoilerHidden(trophy)
    ? 'Story trophy — name and description hidden until earned. Untick the spoiler setting to reveal it.'
    : trophy.description;
}

function matchesFilters(trophy) {
  const kind = els.kind.value;
  if (kind === 'missable' && !trophy.missable) return false;
  if (kind !== 'all' && kind !== 'missable' && trophy.kind !== kind) return false;
  if (els.grade.value !== 'all' && trophy.grade !== els.grade.value) return false;
  const earned = state.earned.has(trophy.name);
  if (els.status.value === 'earned' && !earned) return false;
  if (els.status.value === 'missing' && earned) return false;
  const query = els.search.value.trim().toLowerCase();
  if (query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.kind} ${trophy.grade}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function badge(text, className) {
  const span = document.createElement('span');
  span.className = `badge ${className}`;
  span.textContent = text;
  return span;
}

function renderGuideBody(trophy) {
  const body = document.createElement('div');
  body.className = 'guide-body';
  const guide = document.createElement('p');
  guide.textContent = trophy.guide;
  body.append(guide);
  if (Array.isArray(trophy.sources) && trophy.sources.length > 0) {
    const sources = document.createElement('p');
    sources.className = 'sources';
    const label = document.createElement('strong');
    label.textContent = 'Sources: ';
    sources.append(label, document.createTextNode(trophy.sources.join(' · ')));
    body.append(sources);
  }
  return body;
}

function renderTrophyCard(trophy) {
  const earned = state.earned.has(trophy.name);
  const card = document.createElement('article');
  card.className = `trophy-card${earned ? ' earned' : ''}${trophy.missable ? ' missable-card' : ''}`;

  const head = document.createElement('div');
  head.className = 'trophy-head';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = earned;
  checkbox.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) state.earned.add(trophy.name);
    else state.earned.delete(trophy.name);
    saveProgress();
    render();
  });

  const name = document.createElement('h3');
  name.className = `trophy-name${isSpoilerHidden(trophy) ? ' spoiler-hidden' : ''}`;
  name.textContent = displayName(trophy);

  head.append(checkbox, name, badge(trophy.grade, trophy.grade), badge(trophy.kind, 'kind'));
  if (trophy.missable) head.append(badge('Missable', 'missable'));
  head.append(badge(`Stage ${trophy.stage}`, 'stage'));
  card.append(head);

  const desc = document.createElement('p');
  desc.className = `trophy-desc${isSpoilerHidden(trophy) ? ' spoiler-hidden' : ''}`;
  desc.textContent = displayDescription(trophy);
  card.append(desc);

  const open = state.openGuides.has(trophy.name);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  toggle.textContent = open ? 'Hide guide' : 'Show guide';
  toggle.addEventListener('click', () => {
    if (state.openGuides.has(trophy.name)) state.openGuides.delete(trophy.name);
    else state.openGuides.add(trophy.name);
    render();
  });
  card.append(toggle);
  if (open) card.append(renderGuideBody(trophy));
  return card;
}

function renderChecklist() {
  const visible = state.trophies.filter(matchesFilters);
  els.list.replaceChildren(...visible.map(renderTrophyCard));
  els.empty.hidden = visible.length > 0;
  els.visibleCount.textContent = `Showing ${visible.length} of ${state.trophies.length} trophies`;
}

function renderRoadmap() {
  els.roadmap.replaceChildren();
  for (const stage of state.stages) {
    const inStage = state.trophies.filter((t) => t.stage === stage.stage);
    const done = inStage.filter((t) => state.earned.has(t.name)).length;
    const block = document.createElement('section');
    block.className = 'stage-block';
    const title = document.createElement('h2');
    title.textContent = `Stage ${stage.stage} — ${stage.title}`;
    const summary = document.createElement('p');
    summary.className = 'stage-summary';
    summary.textContent = stage.summary;
    const progress = document.createElement('p');
    progress.className = 'stage-progress';
    progress.textContent = `${done} of ${inStage.length} earned in this stage`;
    const list = document.createElement('ul');
    list.className = 'stage-trophies';
    for (const trophy of inStage) {
      const item = document.createElement('li');
      if (state.earned.has(trophy.name)) item.className = 'earned';
      const name = document.createElement('span');
      name.className = `stage-name${isSpoilerHidden(trophy) ? ' spoiler-hidden' : ''}`;
      name.textContent = displayName(trophy);
      item.append(name, badge(trophy.grade, trophy.grade));
      if (trophy.missable) item.append(badge('Missable', 'missable'));
      list.append(item);
    }
    block.append(title, summary, progress, list);
    els.roadmap.append(block);
  }
}

function renderProgress() {
  const total = state.trophies.length;
  const done = state.earned.size;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  els.progressFill.style.width = `${pct}%`;
  els.progressText.textContent = `${done} of ${total} earned · ${pct}% toward platinum`;
  const perGrade = GRADE_ORDER.map((grade) => {
    const ofGrade = state.trophies.filter((t) => t.grade === grade);
    const got = ofGrade.filter((t) => state.earned.has(t.name)).length;
    return `${grade}: ${got}/${ofGrade.length}`;
  });
  els.progressGrades.textContent = perGrade.join(' · ');
}

function render() {
  renderProgress();
  if (state.view === 'roadmap') renderRoadmap();
  else renderChecklist();
}

function setView(view) {
  state.view = view;
  els.checklistView.hidden = view !== 'checklist';
  els.roadmapView.hidden = view !== 'roadmap';
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
  render();
}

function exportProgress() {
  const payload = {
    app: 'leonida-legend',
    version: 1,
    earned: [...state.earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-legend-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importProgress(file) {
  const parsed = JSON.parse(await file.text());
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('No earned list in that file');
  const known = new Set(state.trophies.map((t) => t.name));
  state.earned = new Set(names.filter((n) => typeof n === 'string' && known.has(n)));
  saveProgress();
  render();
}

function wireControls() {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  }
  for (const control of [els.search, els.kind, els.grade, els.status, els.spoiler]) {
    control.addEventListener('input', render);
    control.addEventListener('change', render);
  }
  document.getElementById('export-progress').addEventListener('click', exportProgress);
  document.getElementById('import-progress').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch {
      els.visibleCount.textContent = 'That file could not be imported as progress.';
    }
    event.target.value = '';
  });
  document.getElementById('reset-progress').addEventListener('click', () => {
    state.earned = new Set();
    saveProgress();
    render();
  });
}

async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  const doc = await response.json();
  state.trophies = Array.isArray(doc) ? doc : doc.trophies;
  state.stages = Array.isArray(doc.stages) ? doc.stages : [];
}

wireControls();
await loadTrophies();
render();
