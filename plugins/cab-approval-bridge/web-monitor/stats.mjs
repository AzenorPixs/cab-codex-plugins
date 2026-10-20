const $ = (selector) => document.querySelector(selector);
const format = (value) => value == null || !Number.isFinite(value) ? 'N/A' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
const seconds = (value) => value == null ? 'N/A' : format(value / 1000) + ' s';
const date = (value) => value == null ? 'N/A' : new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
function node(tag, text, className) {
  const result = document.createElement(tag); result.textContent = text ?? '';
  if (className) result.className = className;
  return result;
}
function table(headers, rows) {
  const holder = node('div', null, 'stats-table');
  const result = node('table'); const head = node('thead'); const heading = node('tr');
  heading.append(...headers.map((label) => node('th', label))); head.append(heading); result.append(head);
  const body = node('tbody');
  for (const row of rows) { const line = node('tr'); line.append(...row.map((value) => node('td', value))); body.append(line); }
  result.append(body); holder.append(result); return holder;
}
const categories = { reservation: 'Réservations', changes: 'Changes métier', native: 'Activité native', nativeChanges: 'Activité native métier' };
const countLabels = { contexts: 'Contextes cumulatifs', admissions: 'Tentatives historiques', catalog: 'Contextes observés',
  events: 'Événements filtrés', intervals: 'Segments temporels', datasets: 'Jeux importés complets' };
let page = 'monitor', timer, loading = false, generation = 0, lastSuccess = null, data = null, preview = null, purging = false;
const selectionKey = () => $('#stats-selection').value + ':' + $('#stats-run').value;
function render() {
  if (!data) return;
  const holder = $('#stats-content'); holder.replaceChildren();
  for (const source of data.sources) {
    const panel = node('section', null, 'panel stats-source');
    panel.append(node('div', source.historical ? 'HISTORIQUE IMPORTÉ' : 'SOURCE NATIVE', 'eyebrow'),
      node('h2', source.sourceId + ' / ' + source.datasetId),
      node('p', 'Fenêtre : ' + date(source.start) + ' → ' + date(source.end) + ' · Dernière observation source : ' + date(source.sourceLastAt), 'detail-note'));
    if (source.absentSelection) panel.append(node('p', source.absentSelection, 'warning'));
    panel.append(table(['Mesure', 'MONO', 'MULTI', 'ZÉRO observé', 'INCONNU', 'Couverture'],
      Object.entries(source.categories).map(([name, value]) => [categories[name] || name, seconds(value.monoMs),
        seconds(value.multiMs), seconds(value.zeroMs), seconds(value.unknownMs), value.coverage == null ? 'N/A' : format(value.coverage * 100) + ' %'])));
    if (source.contexts.length) panel.append(table(['RUN', 'Contexte', 'Change', 'État'], source.contexts.map((c) =>
      [c.runId, c.contextId ?? 'N/A', c.changeId, c.state])));
    panel.append(node('h3', 'Événements présents dans cette sélection'));
    const counts = Object.entries(source.eventCounts);
    panel.append(counts.length ? table(['Type / état', 'Nombre observé'], counts.map(([name, count]) => [name, format(count)])) :
      node('p', 'N/A — aucun événement disponible ; une famille absente ne prouve pas un total nul.', 'detail-note'));
    if (source.perContext.length) {
      panel.append(node('h3', 'Durées observées dans la sélection'), table(['RUN / contexte', 'Réservé', 'Busy observé', 'Attente ressource', 'Détention partagée', 'Activité exclusive', 'Ressources inconnues'],
        source.perContext.map((c) => [c.runId + ' / ' + (c.contextId ?? 'N/A'), seconds(c.reservedMs), seconds(c.busyMs),
          seconds(c.resourceWaitMs), seconds(c.resourceHeldMs), seconds(c.exclusiveActiveMs), seconds(c.resourceUnknownMs)])));
    }
    if (source.quotaComparisons.length) panel.append(node('h3', 'Quota partagé — variations comparables'),
      table(['Avant', 'Après', 'Variation'], source.quotaComparisons.map((q) => [date(q.beforeAt), date(q.afterAt),
        q.comparable ? format(q.deltaPercentagePoints) + ' points' : 'N/A — compte ou fenêtre différents'])));
    holder.append(panel);
  }
  const cumulative = node('section', null, 'panel stats-source');
  cumulative.append(node('div', 'CUMUL PAR CONTEXTE · HORS FENÊTRE TEMPORELLE', 'eyebrow'), node('h2', 'Décisions, outils et latences'));
  for (const c of data.cumulative) {
    cumulative.append(node('h3', c.runId + ' / ' + c.contextId + ' · ' + c.changeId),
      table(['Approuvées', 'Refusées', 'À clarifier', 'En attente', 'Permissions once', 'Erreurs techniques'],
        [[c.decisions.approved, c.decisions.rejected, c.decisions.needs_clarification, c.decisions.pending, c.decisions.once, c.decisions.technicalErrors].map(format)]),
      table(['Latence', 'Nombre', 'Médiane', 'p95', 'Échantillon'], Object.entries(c.latencies).map(([name, value]) =>
        [({ requestToDecision: 'Réception → décision', decisionToOnce: 'Décision → once', nativeTool: 'Outil natif' })[name] || name,
          format(value.count), seconds(value.medianMs), seconds(value.p95Ms), format(value.sampleCount)])),
      node('p', 'Messages observés : user ' + format(c.messages.user) + ' · assistant ' + format(c.messages.assistant), 'detail-note'));
    const tools = Object.entries(c.tools);
    if (tools.length) cumulative.append(table(['Outil', 'Terminé', 'Erreur', 'En cours', 'En attente'], tools.map(([name, v]) =>
      [name, format(v.completed), format(v.error), format(v.running), format(v.pending)])));
  }
  if (!data.cumulative.length) cumulative.append(node('p', 'N/A — aucun cumul natif pour les contextes sélectionnés.', 'detail-note'));
  holder.append(cumulative);
  const limits = node('section', null, 'panel stats-source'); limits.append(node('h2', 'Couverture et limites'));
  limits.append(node('p', 'Persistance : statistiques ' + data.persistence.statistics + ' · observations ' + data.persistence.observations));
  if (data.truncated) limits.append(node('p', 'Affichage tronqué : certaines sources ou certains contextes dépassent les limites de la vue.', 'warning'));
  const list = node('ul'); for (const text of data.limitations) list.append(node('li', text)); limits.append(list); holder.append(limits);
}
async function request(path, body) {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST',
    signal: AbortSignal.timeout(15000), cache: 'no-store',
    headers: body === undefined ? {} : { 'content-type': 'application/json', 'x-cab-statistics': '1' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'statistics-source-unavailable');
  return result;
}
function errorText(error) {
  return ({ 'statistics-preview-changed': 'Les données ou protections ont changé. Relancez la prévisualisation.',
    'statistics-preview-expired': 'La prévisualisation a expiré. Relancez-la.',
    'statistics-maintenance-busy': 'Une maintenance est déjà en cours. Réessayez après son résultat.',
    'statistics-maintenance-unavailable': 'La persistance statistique est dégradée. La purge est indisponible.' })[error.message] ||
    'Source indisponible ou réponse non reçue. Une confirmation peut être répétée avec le même jeton tant qu’il reste valide.';
}
async function refresh() {
  if (page !== 'stats' || loading) return;
  loading = true; clearTimeout(timer);
  const currentGeneration = generation, key = selectionKey();
  $('#stats-refresh').disabled = true;
  try {
    const parameters = new URLSearchParams({ selection: $('#stats-selection').value });
    if ($('#stats-run').value) parameters.set('runId', $('#stats-run').value);
    const result = await request('/api/statistics?' + parameters);
    if (currentGeneration !== generation || key !== selectionKey()) return;
    data = result; lastSuccess = Date.now();
    const selected = $('#stats-run').value;
    const options = [new Option('Tous les RUN', ''), ...result.runOptions.map((run) => new Option(run, run))];
    if (selected && !result.runOptions.includes(selected)) options.push(new Option(selected, selected));
    $('#stats-run').replaceChildren(...options); $('#stats-run').value = selected;
    $('#stats-status').textContent = 'Dernier succès : ' + date(lastSuccess) + ' · Données : ' + date(result.observedAt);
    $('#stats-status').className = ''; render();
  } catch {
    if (currentGeneration === generation) {
      $('#stats-status').textContent = 'Statistiques indisponibles.' + (lastSuccess ? ' Données anciennes · dernier succès : ' + date(lastSuccess) : ' N/A — aucun succès observé.');
      $('#stats-status').className = 'warning';
    }
  } finally {
    loading = false; $('#stats-refresh').disabled = false;
    if (page === 'stats') timer = setTimeout(refresh, currentGeneration === generation ? 5000 : 0);
  }
}
function navigate() {
  page = location.hash === '#stats' ? 'stats' : 'monitor'; generation++; clearTimeout(timer);
  $('#monitor-page').hidden = page !== 'monitor'; $('#stats-page').hidden = page !== 'stats';
  $('#page-label').textContent = page === 'stats' ? 'Statistiques' : 'Supervision';
  for (const name of ['stats', 'monitor']) {
    const link = $('#' + name + '-nav'); link.classList.toggle('active', name === page);
    if (name === page) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  if (page === 'stats') void refresh();
}
for (const name of ['#stats-selection', '#stats-run']) $(name).addEventListener('change', () => {
  generation++; data = null; lastSuccess = null; $('#stats-content').replaceChildren();
  $('#stats-status').textContent = 'Chargement de la sélection…'; void refresh();
});
$('#stats-refresh').addEventListener('click', () => { void refresh(); });
$('#retention-preview').addEventListener('click', async () => {
  $('#retention-preview').disabled = true; $('#retention-status').textContent = 'Prévisualisation…';
  try {
    preview = await request('/api/statistics/retention/preview', { days: Number($('#retention-days').value) });
    if (page !== 'stats') return;
    $('#retention-cutoff').textContent = 'Supprimer les éléments admissibles strictement antérieurs au ' + date(preview.cutoff) + '. Confirmation valable jusqu’au ' + date(preview.expiresAt) + '.';
    $('#retention-counts').replaceChildren(table(['Éléments admissibles', 'Nombre'], Object.entries(preview.counts).map(([name, value]) => [countLabels[name], format(value)])));
    $('#retention-protected').textContent = format(preview.protectedContexts) + ' contexte(s) protégé(s). Approbations, jobs, registre, preuves et agrégats globaux restent conservés.';
    $('#retention-status').textContent = 'Prévisualisation prête. Aucune donnée supprimée.';
    $('#retention-dialog').showModal();
  } catch (error) { $('#retention-status').textContent = errorText(error); }
  finally { $('#retention-preview').disabled = false; }
});
$('#retention-cancel').addEventListener('click', () => { preview = null; $('#retention-dialog').close(); });
$('#retention-dialog').addEventListener('cancel', (event) => { if (purging) event.preventDefault(); else preview = null; });
$('#retention-confirm').addEventListener('click', async () => {
  if (!preview || purging) return;
  purging = true; $('#retention-confirm').disabled = true; $('#retention-cancel').disabled = true;
  try {
    const result = await request('/api/statistics/retention/purge', { token: preview.token, confirm: true });
    const details = result.stores.map((s) => s.name + ' : ' + s.status + ' (' + Object.entries(s.removed).map(([name, value]) =>
      countLabels[name] + ' ' + format(value)).join(', ') + ')').join(' · ');
    $('#retention-status').textContent = (result.status === 'completed' ? 'Purge terminée. ' : 'Échec partiel de la purge. ') + details;
    $('#retention-dialog').close(); preview = null; generation++; void refresh();
  } catch (error) { $('#retention-cutoff').textContent = errorText(error); $('#retention-status').textContent = errorText(error); }
  finally { purging = false; $('#retention-confirm').disabled = false; $('#retention-cancel').disabled = false; }
});
window.addEventListener('hashchange', navigate);
navigate();
