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
let lastWebSuccessAt = null;
let pendingSnapshot = null;
let refreshing = false;
let refreshTimer = null;
let refreshGeneration = 0;
const refreshValues = ['0','1000','3000','7000','30000','60000','300000','600000','1800000'];
const refreshPreference = 'cab-monitor-refresh-ms';
const webFreshMs = 30 * 60 * 1000;
let tasksOpen = false;
let cycleOpen = false;
let historyOpen = false;
let managing = false;
let deleting = null;
let webRestart = null;
const managementErrors = {
  'monitor-item-protected': 'Cet élément n’est plus admissible. Son état actuel reste protégé.',
  'monitor-runs-active': 'Action refusée : un RUN, une demande ou une activité native est encore en cours.',
  'monitor-component-refused': 'Action refusée : CAB doit être disponible et sans RUN réservé ni activité native.',
  'monitor-service-unmanaged': 'Service indisponible pour cette commande : unité dédiée, PID ou workspace non confirmé. Un lancement manuel doit être redémarré manuellement.',
  'monitor-service-command-failed': 'La commande systemd a échoué. Le résultat du service n’est pas confirmé.',
  'monitor-service-state-unconfirmed': 'L’état attendu du service n’est pas confirmé.',
  'monitor-catalog-unavailable': 'Catalogue privé indisponible : aucune modification du rangement n’est possible.',
  'monitor-catalog-full': 'Le catalogue privé a atteint sa limite. Aucune ligne supplémentaire n’a été rangée.',
  'monitor-management-busy': 'Une autre action de gestion est en cours.',
  'monitor-web-restart-failed': 'Le redémarrage du Web a échoué.',
};
async function manage(route, body) {
  if (managing) return;
  if (model && ((route === 'service' && body.component !== 'monitor') ||
      (route === 'catalog' && body.action !== 'restore')) &&
      (isStale('controller', Date.now()) || isStale('registry', Date.now()))) {
    $('#management-status').textContent = 'Actualisez la vue avant une commande de gestion : les observations courantes sont anciennes.';
    return;
  }
  managing = true; render();
  $('#management-status').textContent = 'Action en cours…';
  try {
    const response = await fetch('/api/manage/' + route, { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cab-monitor': '1' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if (result.deferred) {
      webRestart = { startedAt: result.startedAt, deadline: Date.now() + 30000 };
      $('#management-status').textContent = 'Redémarrage du Web demandé. Attente de la reconnexion…';
    } else $('#management-status').textContent = ({ archive: 'Élément archivé dans le moniteur.',
      delete: 'Ligne supprimée du moniteur.', restore: 'RUN désarchivé ; aucune reprise de son exécution.' })[body.action] || 'Action exécutée et état de la brique confirmé.';
    if (result.warning) $('#management-status').textContent += ' La libération de la garde reste non confirmée ; elle expire sous 30 secondes.';
  } catch (error) {
    $('#management-status').textContent = managementErrors[error.message] || 'Action non confirmée. Vérifiez l’état affiché avant de réessayer.';
  } finally { managing = false; render(); }
}
function actionButton(label, title, callback, disabled = false) {
  const button = node('button', 'small-action', label);
  button.type = 'button'; button.title = title; button.setAttribute('aria-label', title);
  button.disabled = managing || disabled;
  button.addEventListener('click', callback);
  return button;
}
const stepStatusNames = { IN_PROGRESS: 'En cours', ALREADY_COVERED: 'Déjà couverte', NOT_APPLICABLE: 'Non applicable' };
const stepLabel = (step) => step ? step.name + ' · ' + step.position + '/' + step.total : 'Non renseignée';
const labels = { 'validation-received': 'Demande de validation reçue', 'validation-manually-answered': 'Décision explicite reçue',
  'validation-answered': 'Décision transmise', 'job-progress': 'Progression du job', 'job-armed': 'Job armé',
  'job-disarmed': 'Job désarmé', 'opencode-permission-answered': 'Permission native transmise',
  'opencode-permission-approved': 'Permission native transmise', 'operation-state-observed': 'État d’opération observé' };
function isStale(name, at = Date.parse(model.generatedAt)) {
  const source = model?.sources[name];
  return !source?.available || !source.lastSuccessAt || at - Date.parse(source.lastSuccessAt) > model.configuration.staleMs;
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
const terminalRun = (run) => ['RELEASED', 'DELIVERED', 'ABANDONED'].includes(run.state) || run.gate.status === 'VALIDATED';
function renderHealth() {
  const holder = $('#health');
  const focus = holder.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') : null;
  holder.replaceChildren();
  const entries = [['controller', 'Contrôleur', 'Pilotage et décisions', '⌘'], ['supervisor', 'Superviseur', 'Suivi et reprises', '◎'],
    ['broker', 'Broker MCP', 'Connexion MCP native', '⇄'], ['opencode', 'OpenCode', 'Santé HTTP native', '◇'],
    ['monitor', 'Web', 'Interface et archives locales', '▦']];
  for (const [key, label, subtitle, icon] of entries) {
    const stale = key === 'monitor' ? lastWebSuccessAt === null || Date.now() - lastWebSuccessAt >= webFreshMs : key === 'broker' ? isStale('mcp') : isStale(key);
    const source = model.sources[key];
    const healthy = key === 'broker' ? model.brokerConnection === 'connected' : key === 'opencode' ? model.nativeHealth === true : true;
    const status = key === 'monitor' ? stale ? 'Non observé' : 'Disponible' :
      stale ? (key === 'broker' ? 'Non confirmé' : source?.lastSuccessAt ? 'Indisponible' : 'Non observé') : healthy ? 'Disponible' : 'Dégradé';
    const card = node('div', 'health-card');
    const name = node('div'); name.append(node('div', 'health-name', label), node('div', 'health-sub', subtitle));
    const version = model.componentVersions?.[key];
    name.append(node('div', 'health-version', version ? 'v' + version : 'Version indisponible'));
    const pill = node('span', 'health-status ' + (stale ? 'warn' : healthy ? 'good' : 'bad')); pill.append(node('i', 'dot'), document.createTextNode(status));
    card.append(node('span', 'health-icon', icon), name, pill);
    card.dataset.component = key;
    if (key !== 'opencode') {
      const actions = node('div', 'component-actions');
      const occupied = model.runs.some((run) => run.state === 'RESERVED' || run.armed || run.hasMandate || run.pending > 0);
      const currentStale = isStale('controller', Date.now()) || isStale('registry', Date.now());
      const active = key === 'broker' ? model.brokerConnection === 'connected' : !stale;
      if (key !== 'monitor') actions.append(actionButton(active ? 'Arrêter' : 'Démarrer',
        (active ? 'Arrêter ' : 'Démarrer ') + label, () => { void manage('service', { component: key, action: active ? 'stop' : 'start' }); }, currentStale || active && occupied));
      actions.append(actionButton('Redémarrer', 'Redémarrer ' + label,
        () => { void manage('service', { component: key, action: 'restart' }); },
        key === 'monitor' ? Boolean(webRestart) : occupied || currentStale));
      card.append(actions);
    }
    card.title = 'Dernier succès : ' + date(key === 'monitor' ? lastWebSuccessAt === null ? null : new Date(lastWebSuccessAt).toISOString() :
      key === 'broker' ? model.broker.observedAt : source?.lastSuccessAt, true);
    holder.append(card);
  }
  if (focus) for (const button of holder.querySelectorAll('button')) {
    if (button.getAttribute('aria-label') === focus && !button.disabled) button.focus({ preventScroll: true });
  }
}
function renderMetrics() {
  const current = model.runs.filter((run) => !terminalRun(run));
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
  if (view === 'runs') values = values.filter((run) => filter === 'all' || (filter === 'terminal' ? terminalRun(run)
    : filter === 'waiting' ? runState(run)[0] === 'WAITING' : !terminalRun(run)));
  const completed = (value) => {
    const progress = (view === 'runs' ? changeFor(value.changeId) : value)?.progress;
    return progress?.available ? progress.completed : -1;
  };
  values.sort((left, right) => completed(right) - completed(left) ||
    (left.changeId || '').localeCompare(right.changeId || '', 'fr') ||
    (left.runId || '').localeCompare(right.runId || '', 'fr'));
  $('#result-count').textContent = values.length + (view === 'runs' ? ' RUN affiché(s)' : ' change(s) affiché(s)');
  $('#filter').disabled = view !== 'runs';
  if (!values.length) { container.replaceChildren(node('p', 'empty', query ? 'Aucun résultat pour cette recherche.' :
    view === 'runs' ? 'Aucun RUN observé. Les exécutions apparaîtront dès leur disponibilité.' : 'Aucun change actif disponible.')); return; }
  const table = node('table');
  const header = node('tr');
  for (const label of view === 'runs' ? ['RUN / CHANGE', 'ETAT', 'ÉTAPE', 'TÂCHES COCHÉES', 'ACTIONS'] : ['CHANGE', 'EMPLACEMENT', 'TÂCHES COCHÉES', 'ACTIONS']) header.append(node('th', '', label));
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
    const actions = node('td', 'row-actions');
    const kind = isRun ? 'runs' : 'changes';
    const identityLabel = isRun ? value.runId : value.changeId;
    actions.append(actionButton('▣', 'Archiver ' + identityLabel,
      () => { void manage('catalog', { kind, key: value.key, action: 'archive' }); }, !value.manageable),
      actionButton('×', 'Supprimer ' + identityLabel + ' du moniteur', () => {
        deleting = { kind, key: value.key, action: 'delete', confirm: true };
        $('#management-confirm-text').textContent = 'Supprimer ' + identityLabel + ' de l’affichage du moniteur ?';
        $('#management-dialog').showModal();
      }, !value.manageable));
    if (!value.manageable) actions.title = 'Disponible après clôture et libération, sans activité en cours, avec des sources fraîches.';
    row.append(actions);
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
  const focusedAction = document.activeElement?.classList.contains('small-action') ? document.activeElement.getAttribute('aria-label') : null;
  if (!selectedRun && model.runs.length) selectedRun = model.runs[0].runId;
  if (!selectedChange && model.changes.changes.length) selectedChange = model.changes.changes[0].changeId;
  $('#updated').textContent = 'Dernière vue · ' + date(model.generatedAt, true);
  $('#cadence').textContent = 'Collecte ' + model.configuration.pollMs / 1000 + ' s · vue ' + $('#refresh-interval').selectedOptions[0].textContent;
  $('#version').textContent = model.version; $('#footer-version').textContent = model.version;
  renderHealth(); renderMetrics(); renderWork(); renderDetail(); renderTimeline(); renderArchives();
  if (model.management?.catalogError) $('#management-status').textContent = managementErrors[model.management.catalogError] || 'Gestion du catalogue indisponible.';
  if (model.management?.serviceError) {
    webRestart = null; $('#management-status').textContent = managementErrors[model.management.serviceError] || 'Action de service non confirmée.';
  }
  if (webRestart && model.startedAt !== webRestart.startedAt) {
    webRestart = null; $('#management-status').textContent = 'Web redémarré et connexion rétablie.';
  }
  if (focusedRun || focusedChange) for (const button of document.querySelectorAll('[data-run],[data-change]')) {
    if (focusedRun ? button.dataset.run === focusedRun : button.dataset.change === focusedChange) button.focus({ preventScroll: true });
  }
  if (focusedAction) for (const button of document.querySelectorAll('.small-action')) {
    if (button.getAttribute('aria-label') === focusedAction && !button.disabled) button.focus({ preventScroll: true });
  }
}
function renderArchives() {
  for (const kind of ['runs', 'changes']) {
    const holder = $('#archives-' + kind); holder.replaceChildren();
    const values = model.archives?.[kind] || [];
    if (!values.length) { holder.append(node('p', 'empty', 'Aucune archive du moniteur.')); continue; }
    const table = node('table'); const head = node('thead'); const heading = node('tr');
    for (const label of ['Identité', 'Change', 'Archivé le', 'Actions']) heading.append(node('th', '', label));
    head.append(heading); table.append(head); const body = node('tbody');
    for (const value of values) {
      const row = node('tr');
      for (const text of [kind === 'runs' ? value.runId : value.changeId, value.changeId, date(value.archivedAt, true)]) row.append(node('td', '', text));
      const actions = node('td', 'row-actions');
      if (kind === 'runs') actions.append(actionButton('↥', 'Désarchiver ' + value.runId,
        () => { void manage('catalog', { kind, key: value.key, action: 'restore' }); }, Boolean(model.management?.catalogError)));
      row.append(actions); body.append(row);
    }
    table.append(body); holder.append(table);
  }
}
$('#management-cancel').addEventListener('click', () => { deleting = null; $('#management-dialog').close(); });
$('#management-dialog').addEventListener('cancel', () => { deleting = null; });
$('#management-confirm').addEventListener('click', () => {
  if (!deleting) return;
  const body = deleting; deleting = null; $('#management-dialog').close(); void manage('catalog', body);
});
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
  try {
    const value = JSON.parse(event.data);
    if (!validSnapshot(value)) throw new Error('invalid snapshot');
    pendingSnapshot = { value, receivedAt: Date.now() };
  } catch { $('#connection').textContent = 'Observation invalide'; }
});
stream.addEventListener('error', () => { connected = false; $('#connection').className = 'connection'; $('#connection').replaceChildren(node('i'), document.createTextNode('Reconnexion…')); render(); });
function validSnapshot(value) {
  return value && typeof value.version === 'string' && value.configuration && value.sources &&
    Array.isArray(value.runs) && Array.isArray(value.changes?.changes) && Number.isFinite(Date.parse(value.generatedAt));
}
async function refreshView(explicit = true) {
  if (refreshing) return;
  const generation = refreshGeneration;
  const previous = { model, lastWebSuccessAt };
  refreshing = true; $('#monitor-refresh').disabled = true;
  try {
    let snapshot;
    if (!explicit && pendingSnapshot && connected && Date.now() - pendingSnapshot.receivedAt <= 1000) {
      snapshot = { value: pendingSnapshot.value, receivedAt: Date.now() }; pendingSnapshot = null;
    }
    else {
      const response = await fetch('/api/snapshot', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('snapshot unavailable');
      const value = await response.json();
      if (!validSnapshot(value)) throw new Error('invalid snapshot');
      snapshot = { value, receivedAt: Date.now() }; pendingSnapshot = null;
    }
    if (!explicit && generation !== refreshGeneration) return;
    model = snapshot.value; lastWebSuccessAt = snapshot.receivedAt;
    $('#refresh-status').textContent = ''; render();
  } catch {
    model = previous.model; lastWebSuccessAt = previous.lastWebSuccessAt;
    if (model) render();
    $('#refresh-status').textContent = 'Actualisation impossible ; dernière vue conservée.';
  } finally { refreshing = false; $('#monitor-refresh').disabled = false; }
}
function scheduleRefresh() {
  refreshGeneration++;
  clearInterval(refreshTimer); refreshTimer = null;
  const value = $('#refresh-interval').value;
  if (value !== '0') refreshTimer = setInterval(() => { void refreshView(false); }, Number(value));
  render();
}
try {
  const saved = localStorage.getItem(refreshPreference);
  if (refreshValues.includes(saved)) $('#refresh-interval').value = saved;
} catch { /* La vue reste réglable sans stockage local disponible. */ }
$('#refresh-interval').addEventListener('change', () => {
  try { localStorage.setItem(refreshPreference, $('#refresh-interval').value); }
  catch { $('#refresh-status').textContent = 'Choix actif pour cette page ; mémorisation indisponible.'; }
  scheduleRefresh();
});
$('#monitor-refresh').addEventListener('click', () => { void refreshView(); });
scheduleRefresh(); void refreshView();
const healthTimer = setInterval(() => {
  if (webRestart && Date.now() > webRestart.deadline) {
    webRestart = null; $('#management-status').textContent = 'Redémarrage Web non confirmé dans le délai prévu.';
  }
  if (model) { renderHealth(); if (!connected) render(); }
}, 1000);
window.addEventListener('pagehide', () => { clearInterval(refreshTimer); clearInterval(healthTimer); stream.close(); });
