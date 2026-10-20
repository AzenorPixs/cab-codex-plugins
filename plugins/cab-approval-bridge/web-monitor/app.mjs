import './stats.mjs';

const $ = (selector) => document.querySelector(selector);
const number = (value) => value == null ? '—' : new Intl.NumberFormat('fr-FR').format(value);
const date = (value, full = false) => value ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris',
  ...(full ? { day: '2-digit', month: 'short' } : {}), hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)) : 'Non observé';
function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content != null) element.textContent = content;
  return element;
}
let model = null;
let selectedRun = null;
let selectedChange = null;
let view = 'runs';
let connected = false;
let tasksOpen = false;
let cycleOpen = false;
let historyOpen = false;
const stepStatusNames = { IN_PROGRESS: 'En cours', ALREADY_COVERED: 'Déjà couverte', NOT_APPLICABLE: 'Non applicable' };
const stepLabel = (step) => step ? step.name + ' · ' + step.position + '/' + step.total : 'Non renseignée';
const labels = { 'validation-received': 'Demande de validation reçue', 'validation-manually-answered': 'Décision explicite reçue',
  'validation-answered': 'Décision transmise', 'job-progress': 'Progression du job', 'job-armed': 'Job armé',
  'job-disarmed': 'Job désarmé', 'opencode-permission-answered': 'Permission native transmise',
  'opencode-permission-approved': 'Permission native transmise', 'operation-state-observed': 'État d’opération observé' };
function isStale(name) {
  const source = model?.sources[name];
  return !source?.available || !source.lastSuccessAt || Date.now() - Date.parse(source.lastSuccessAt) > model.configuration.staleMs;
}
function runState(run) {
  const state = isStale('controller') || (run.runId !== 'legacy' && run.state && isStale('registry')) ? 'UNKNOWN' : run.operationalState || 'UNKNOWN';
  return [state, ({ RUNNING: 'good', WAITING: 'warn', PAUSED: 'warn', STOPPED: 'neutral', BLOCKED: 'bad',
    DONE: 'good', DEGRADED: 'warn', RELEASED: 'neutral', IDLE: 'neutral', UNKNOWN: 'neutral' })[state] || 'neutral'];
}
function badge(label, tone) { const pill = node('span', 'pill ' + tone); pill.append(node('i', 'dot'), document.createTextNode(label)); return pill; }
function progress(change) {
  const box = node('div');
  const p = change?.progress;
  if (!p?.available) { box.append(node('span', 'subtext', 'Avancement indisponible')); return box; }
  const title = node('div', 'progress-top'); title.append(node('span', '', p.completed + '/' + p.total), node('span', 'neutral', 'tâches'));
  const bar = node('progress'); bar.max = p.total; bar.value = p.completed; bar.setAttribute('aria-label', p.completed + ' tâches cochées sur ' + p.total);
  box.append(title, bar); return box;
}
function changeFor(id) { return model.changes.changes.find((change) => change.changeId === id); }
function renderHealth() {
  const holder = $('#health'); holder.replaceChildren();
  const entries = [['controller', 'Contrôleur', 'Pilotage et décisions', '⌘'], ['supervisor', 'Superviseur', 'Suivi et reprises', '◎'],
    ['broker', 'Broker MCP', 'Dernière readiness reçue', '⇄'], ['opencode', 'OpenCode', 'Santé HTTP native', '◇']];
  for (const [key, label, subtitle, icon] of entries) {
    const stale = key === 'broker' ? model.broker.stale || isStale('controller') ||
      Date.now() - Date.parse(model.broker.observedAt) > model.configuration.staleMs : isStale(key);
    const source = model.sources[key];
    const healthy = key === 'broker' ? model.broker.status === 'READY' : key === 'opencode' ? model.nativeHealth === true : true;
    const status = stale ? (key === 'broker' ? 'Non confirmé' : source?.lastSuccessAt ? 'Indisponible' : 'Non observé') : healthy ? 'Disponible' : 'Dégradé';
    const card = node('div', 'health-card');
    const name = node('div'); name.append(node('div', 'health-name', label), node('div', 'health-sub', subtitle));
    const version = model.componentVersions?.[key];
    name.append(node('div', 'health-version', version ? 'v' + version : 'Version indisponible'));
    const pill = node('span', 'health-status ' + (stale ? 'warn' : healthy ? 'good' : 'bad')); pill.append(node('i', 'dot'), document.createTextNode(status));
    card.append(node('span', 'health-icon', icon), name, pill);
    card.title = 'Dernier succès : ' + date(key === 'broker' ? model.broker.observedAt : source?.lastSuccessAt, true);
    holder.append(card);
  }
}
function renderMetrics() {
  const current = model.runs.filter((run) => run.state !== 'RELEASED' && run.gate.status !== 'VALIDATED');
  const waiting = current.filter((run) => runState(run)[0] === 'WAITING');
  const metrics = [['RUN en cours', isStale('controller') ? null : current.length, 'Exécutions observées dans ce workspace', '↗'],
    ['Changes actifs', model.changes.available ? model.changes.changes.filter((c) => c.location === 'active').length : null, 'Référentiel OpenSpec local', '▤'],
    ['RUN en attente', isStale('controller') ? null : waiting.length, 'Validation, ressource ou intervention', '◷'],
    ['Limite du contrôleur', model.configuration.maxCommandLength, 'Unités UTF-16 · défaut 16 384' + (isStale('controller') ? ' · ancienne observation' : ''), '⌁']];
  $('#metrics').replaceChildren(...metrics.map(([label, value, note, icon], index) => {
    const card = node('div', 'metric' + (index === 3 ? ' accent' : ''));
    const heading = node('div', 'metric-label', label); heading.append(node('span', 'metric-icon', icon));
    card.append(heading, node('div', 'metric-value', number(value)), node('div', 'metric-note', note)); return card;
  }));
}
function renderWork() {
  const container = $('#work-content');
  const query = $('#search').value.toLocaleLowerCase('fr');
  const filter = $('#filter').value;
  let values = view === 'runs' ? model.runs : model.changes.changes;
  values = values.filter((value) => [value.runId, value.changeId, value.title].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query));
  if (view === 'runs') values = values.filter((run) => filter === 'all' || (filter === 'terminal' ? run.gate.status === 'VALIDATED' || run.state === 'RELEASED'
    : filter === 'waiting' ? runState(run)[0] === 'WAITING' : run.gate.status !== 'VALIDATED' && run.state !== 'RELEASED'));
  $('#result-count').textContent = values.length + (view === 'runs' ? ' RUN affiché(s)' : ' change(s) affiché(s)');
  $('#filter').disabled = view !== 'runs';
  if (!values.length) { container.replaceChildren(node('p', 'empty', query ? 'Aucun résultat pour cette recherche.' :
    view === 'runs' ? 'Aucun RUN observé. Les exécutions apparaîtront dès leur disponibilité.' : 'Aucun change actif disponible.')); return; }
  const table = node('table');
  const header = node('tr');
  for (const label of view === 'runs' ? ['RUN / CHANGE', 'ETAT', 'ÉTAPE', 'TÂCHES COCHÉES'] : ['CHANGE', 'EMPLACEMENT', 'TÂCHES COCHÉES']) header.append(node('th', '', label));
  table.append(node('thead')); table.firstChild.append(header);
  const body = node('tbody');
  for (const value of values) {
    const isRun = view === 'runs';
    const change = isRun ? changeFor(value.changeId) : value;
    const row = node('tr', (isRun ? selectedRun === value.runId : selectedChange === value.changeId) ? 'selected' : '');
    if (isRun) {
      row.dataset.state = runState(value)[0];
      if (row.dataset.state === 'WAITING') row.classList.add('run-waiting');
      if (row.dataset.state === 'BLOCKED') row.classList.add('run-blocked');
    }
    const identity = node('td'); const button = node('button', isRun ? 'run-button' : 'change-button', isRun ? value.runId : value.changeId);
    button.dataset[isRun ? 'run' : 'change'] = isRun ? value.runId : value.changeId;
    button.addEventListener('click', () => { if (isRun) selectedRun = value.runId; else selectedChange = value.changeId;
      tasksOpen = false; cycleOpen = false; historyOpen = false; render(); });
    identity.append(button, node('div', 'subtext', isRun ? value.changeId || 'Change non observé' : value.title)); row.append(identity);
    const state = node('td'); state.append(isRun ? badge(...runState(value)) : badge(value.location === 'archived' ? 'Archivé' : value.location === 'active' ? 'Actif' : 'Indisponible', 'neutral')); row.append(state);
    if (isRun) {
      const step = node('td', 'step-cell'); step.append(node('div', 'step-name', stepLabel(value.step)));
      if (value.step) step.append(node('div', 'subtext', isStale('controller') ? 'Ancienne observation' : stepStatusNames[value.step.status]));
      step.title = value.step ? stepStatusNames[value.step.status] + ' · ' + date(value.step.at, true) : 'Aucune étape déclarée pour ce job';
      row.append(step);
    }
    const count = node('td'); count.append(progress(change)); row.append(count);
    body.append(row);
  }
  table.append(body); container.replaceChildren(table);
}
function detailLine(label, value) { const row = node('div', 'detail-line'); row.append(node('span', '', label), node('span', '', value || 'Non observé')); return row; }
function taskDetails(change) {
  const section = node('div'); section.append(node('div', 'detail-section', 'Avancement du change'), progress(change));
  if (change?.progress.available) {
    const details = node('details'); details.open = tasksOpen;
    details.addEventListener('toggle', () => { tasksOpen = details.open; });
    details.append(node('summary', '', 'Examiner les ' + change.progress.total + ' tâches'));
    const list = node('ul', 'task-list');
    for (const task of change.progress.tasks) { const row = node('li'); row.append(node('span', 'task-check' + (task.done ? ' done' : ''), task.done ? '✓' : '○'), node('span', '', task.label)); list.append(row); }
    details.append(list); section.append(details);
  }
  section.append(node('p', 'detail-note', 'Les cases cochées proviennent de tasks.md. Elles ne constituent ni une estimation de durée, ni une preuve de validation du RUN.'));
  return section;
}
function cycleDetails(run) {
  const section = node('div', 'lifecycle-details');
  const cycle = node('details'); cycle.open = cycleOpen;
  cycle.addEventListener('toggle', () => { cycleOpen = cycle.open; });
  cycle.append(node('summary', '', 'Les 11 étapes du cycle'));
  const stages = node('ol', 'cycle-list');
  for (const step of model.stepCatalog || []) {
    const item = node('li', step.id === run.step?.id ? 'current-step' : '');
    if (step.id === run.step?.id) item.setAttribute('aria-current', 'step');
    item.append(node('span', 'cycle-position', step.position + '/' + step.total), node('span', '', step.name));
    const last = [...(run.stepHistory || [])].reverse().find((entry) => entry.id === step.id);
    if (last?.status === 'NOT_APPLICABLE' || last?.status === 'ALREADY_COVERED') item.append(node('small', '', stepStatusNames[last.status]));
    stages.append(item);
  }
  cycle.append(stages); section.append(cycle);
  if (run.stepHistory?.length) {
    const history = node('details'); history.open = historyOpen;
    history.addEventListener('toggle', () => { historyOpen = history.open; });
    history.append(node('summary', '', 'Historique des étapes · ' + run.stepSequence + ' passage(s)'));
    const list = node('ol', 'step-history');
    for (const entry of [...run.stepHistory].reverse()) {
      const item = node('li'); item.append(node('span', '', stepLabel(entry)), node('small', '',
        '#' + entry.sequence + ' · ' + date(entry.at, true) + ' · ' + stepStatusNames[entry.status])); list.append(item);
    }
    history.append(list);
    if (run.stepHistoryTruncated) history.append(node('p', 'detail-note', 'Les 100 derniers passages sont conservés.'));
    section.append(history);
  }
  section.append(node('p', 'detail-note', 'Le cycle accepte les retours vers une étape antérieure. La position ne valide ni les étapes précédentes, ni le gate terminal.'));
  return section;
}
function renderDetail() {
  const holder = $('#detail'); const run = model.runs.find((value) => value.runId === selectedRun);
  const change = view === 'changes' ? changeFor(selectedChange) : run ? changeFor(run.changeId) : null;
  $('#detail-title').textContent = view === 'runs' ? 'Détail du RUN' : 'Détail du change';
  holder.replaceChildren();
  if (view === 'changes' && change) { holder.append(node('div', 'detail-name', change.changeId), node('p', 'detail-note', change.title), taskDetails(change)); return; }
  if (!run || view !== 'runs') { holder.append(node('p', 'empty', 'Sélectionnez une ligne pour examiner son état.')); return; }
  holder.append(node('div', 'detail-name', run.runId), badge(...runState(run)), detailLine('Change', run.changeId),
    detailLine('Session', run.sessionId), detailLine('Étape', stepLabel(run.step)), detailLine('Phase', run.phase),
    detailLine('Activité native', isStale('sessions') ? 'Non confirmée' : ({ busy: 'En cours', idle: 'Inactive', retry: 'Nouvelle tentative' }[run.nativeActivity] || run.nativeActivity)),
    detailLine('Mandat courant', run.currentMandate || (run.hasMandate ? 'Mandat actif · détail non public' : 'Aucun mandat observé')),
    detailLine('Gate terminal', run.gate.status), detailLine('Demandes indécises', number(run.pending)),
    detailLine('Dernier jalon prouvé', run.lastProvenMilestone), detailLine('Cause / attente', run.cause),
    detailLine('RUN bloquant(s)', run.blockers.join(', ') || null), cycleDetails(run), taskDetails(change));
}
function renderTimeline() {
  const filter = $('#timeline-filter');
  const previous = filter.value;
  const options = [node('option', '', 'Tous les RUN'), ...model.runs.map((run) => { const option = node('option', '', run.runId); option.value = run.runId; return option; })]; options[0].value = 'all';
  filter.replaceChildren(...options); filter.value = model.runs.some((run) => run.runId === previous) ? previous : 'all';
  const coverage = model.coverage;
  $('#coverage').textContent = 'Événements publics filtrés · flux contrôleur ' + (coverage.stream === 'connected' ? 'connecté' : 'en reconnexion, collecte périodique active') +
    ' · couverture depuis le démarrage des sources.' + (coverage.truncated ? ' Rétention bornée : les événements les plus anciens ont été retirés.' : '') +
    (coverage.restarted ? ' Un redémarrage du contrôleur a interrompu la couverture.' : '');
  $('#coverage').className = 'coverage' + (coverage.truncated || coverage.restarted ? ' warning' : '');
  const events = model.events.filter((event) => filter.value === 'all' || event.runId === filter.value).slice(-50).reverse();
  $('#timeline').replaceChildren(...events.map((event) => {
    const row = node('li'); const time = node('time', '', date(event.at)); time.dateTime = event.at;
    const stage = (model.stepCatalog || []).find((step) => step.id === event.stepId);
    const title = node('div', 'event-text', event.type === 'lifecycle-step-changed' ? 'Étape du RUN · ' + stepLabel(stage) : labels[event.type] || event.type.replaceAll('-', ' '));
    title.append(node('small', '', [event.requestId, event.changeId, event.decision, event.operationState,
      event.stepStatus ? stepStatusNames[event.stepStatus] : null].filter(Boolean).join(' · ')));
    row.append(time, node('span', 'event-dot'), title, node('span', 'event-run', event.runId || 'Commun / historique')); return row;
  }));
  if (!events.length) $('#timeline').append(node('li', 'neutral', 'Aucune transition disponible dans cette couverture.'));
}
function render() {
  if (!model) return;
  const focusedRun = document.activeElement?.dataset.run;
  const focusedChange = document.activeElement?.dataset.change;
  if (!selectedRun && model.runs.length) selectedRun = model.runs[0].runId;
  if (!selectedChange && model.changes.changes.length) selectedChange = model.changes.changes[0].changeId;
  $('#updated').textContent = 'Dernière vue · ' + date(model.generatedAt, true);
  $('#cadence').textContent = 'Collecte ' + model.configuration.pollMs / 1000 + ' s · événements SSE';
  $('#version').textContent = model.version; $('#footer-version').textContent = model.version;
  renderHealth(); renderMetrics(); renderWork(); renderDetail(); renderTimeline();
  if (focusedRun || focusedChange) for (const button of document.querySelectorAll('[data-run],[data-change]')) {
    if (focusedRun ? button.dataset.run === focusedRun : button.dataset.change === focusedChange) button.focus({ preventScroll: true });
  }
}
for (const tab of ['runs', 'changes']) $('#' + tab + '-tab').addEventListener('click', () => {
  view = tab;
  for (const name of ['runs', 'changes']) { $('#' + name + '-tab').classList.toggle('active', name === view); $('#' + name + '-tab').setAttribute('aria-pressed', String(name === view)); }
  render();
});
$('#search').addEventListener('input', renderWork); $('#filter').addEventListener('change', renderWork);
$('#timeline-filter').addEventListener('change', renderTimeline);
const stream = new EventSource('/api/events');
stream.addEventListener('open', () => { connected = true; $('#connection').className = 'connection connected'; $('#connection').replaceChildren(node('i'), document.createTextNode('Vue connectée')); });
stream.addEventListener('snapshot', (event) => {
  try { model = JSON.parse(event.data); render(); }
  catch { $('#connection').textContent = 'Observation invalide'; }
});
stream.addEventListener('error', () => { connected = false; $('#connection').className = 'connection'; $('#connection').replaceChildren(node('i'), document.createTextNode('Reconnexion…')); render(); });
setInterval(() => { if (model) { renderHealth(); if (!connected) render(); } }, 1000);
