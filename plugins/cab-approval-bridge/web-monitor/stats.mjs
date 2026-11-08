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
  if(data.backend==='sgs') {
    $('.retention-panel').hidden=true;
    for(const session of data.sessions) {
      const panel=node('section',null,'panel stats-source');
      panel.append(node('h2',session.change+' · '+session.run),
        node('p',session.agent+' / '+session.role+' · '+session.mode+' · '+session.session,'detail-note'),
        table(['Mesure','Valeur','Couverture'],Object.entries(session.coverage).sort().map(([name,coverage])=>[name,session.metrics[name]??'N/A',coverage])),
        table(['Début','Fin','Modèle','Fournisseur','Raisonnement'],session.models.map(item=>[date(item.from),date(item.until),item.model.name??'N/A',item.model.provider??'N/A',item.model.reasoning??'N/A'])),
        node('p','Collecteur : '+session.collector.status+' · '+session.events+' événements.','detail-note'));
      let cursor=0;const history=node('button','Consulter les mesures reçues');history.type='button';
      history.addEventListener('click',async()=>{
        history.disabled=true;
        try{const result=await request('/api/statistics/events?'+new URLSearchParams({binding:session.binding,after:String(cursor),limit:'100'}));
          const pre=node('pre',JSON.stringify(result.events,null,2));pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';panel.append(pre);
          if(result.next){cursor=result.next;history.textContent='Mesures suivantes';history.disabled=false;}
        }catch{panel.append(node('p','Historique indisponible.'));history.disabled=false;}
      });panel.append(history);
      holder.append(panel);
    }
    for(const archive of data.archives) {
      const panel=node('section',null,'panel stats-source');
      panel.append(node('h2',archive.change),node('p',archive.path+' · SHA256 '+archive.sha256,'detail-note'),
        table(['Mesure','Valeur','État'],Object.entries(archive.contribution.metrics||{}).map(([name,value])=>[name,value.value??'N/A',value.state])));
      holder.append(panel);
    }
    for(const component of data.components||[]) {
      const panel=node('section',null,'panel stats-source');
      panel.append(node('h2',component.component),node('p',date(component.at)+' · '+component.bytes+' octets · SHA256 '+component.fingerprint,'detail-note'));
      const button=node('button','Consulter les statistiques détenues par SGS');button.type='button';
      button.addEventListener('click',async()=>{
        button.disabled=true;
        try{const value=await request('/api/statistics/component?'+new URLSearchParams({component:component.component}));const pre=node('pre',JSON.stringify(value.data,null,2));pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';panel.append(pre);}
        catch{panel.append(node('p','Lecture indisponible.'));button.disabled=false;}
      });panel.append(button);holder.append(panel);
    }
    if(!data.sessions.length&&!data.archives.length)holder.append(node('p','Aucune mesure SGS collectée ; une source absente ne vaut pas zéro.','detail-note'));
    holder.append(node('p',data.totals_policy,'detail-note'));return;
  }
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
  page = ['#stats', '#archives','#ccab'].includes(location.hash) ? location.hash.slice(1) : 'monitor'; generation++; clearTimeout(timer);
  for (const name of ['monitor', 'stats', 'archives','ccab']) $('#' + name + '-page').hidden = page !== name;
  $('#page-label').textContent = ({ stats: 'Statistiques', archives: 'Archives', monitor: 'Supervision',ccab:'Incidents CCAB' })[page];
  for (const name of ['stats', 'monitor', 'archives','ccab']) {
    const link = $('#' + name + '-nav'); link.classList.toggle('active', name === page);
    if (name === page) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  if (page === 'stats') void refresh();
  if(page==='ccab')void refreshCCAB();
  if(page==='archives')void refreshArchiveData();
}
async function refreshArchiveData() {
  const holder=$('#archives-retained');holder.replaceChildren(node('p','Chargement…'));
  try {
    const result=await request('/api/archives');holder.replaceChildren();
    for(const archive of result.archives) {
      const panel=node('section',null,'stats-source');
      const versionLabel=archive.supersedes?' · copie complétée':result.archives.some(other=>other.supersedes===archive.archiveId)?' · copie antérieure':'';
      panel.append(node('h3',archive.changeId),node('p',archive.branch+' · '+archive.runIds.join(', ')+versionLabel,'detail-note'));
      for(const file of archive.files) {
        const row=node('div',null,'retention-actions');
        row.append(node('span',file.origin+' · '+file.bytes+' octets'));
        const view=node('button','Consulter');view.type='button';
        view.addEventListener('click',async()=>{
          view.disabled=true;
          try {
            const value=await request('/api/archives/content?'+new URLSearchParams({archiveId:archive.archiveId,sha256:file.sha256}));
            const dialog=node('dialog'),pre=node('pre',value.content),close=node('button','Fermer');
            pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';close.type='button';close.addEventListener('click',()=>dialog.close());
            dialog.append(node('h2',value.origin),node('p','SHA256 '+value.sha256),pre,close);document.body.append(dialog);
            dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
          }catch{row.append(node('p','Lecture non confirmée.'));}finally{view.disabled=false;}
        });row.append(view);panel.append(row);
      }
      const remove=node('button','Supprimer cette copie CAB','danger-button');remove.type='button';
      remove.addEventListener('click',async()=>{
        remove.disabled=true;
        try {
          const response=await fetch('/api/archives/delete',{method:'POST',headers:{'content-type':'application/json','x-cab-monitor':'1'},
            body:JSON.stringify({archiveId:archive.archiveId,fingerprint:archive.fingerprint}),signal:AbortSignal.timeout(15000)});
          const value=await response.json();if(!response.ok)throw new Error(value.error);await refreshArchiveData();
        }catch{panel.append(node('p','Suppression non confirmée : vérifier la disponibilité et l’état du RUN.'));remove.disabled=false;}
      });panel.append(remove);holder.append(panel);
    }
    if(!result.archives.length)holder.append(node('p','Aucun rapport conservé dans les archives CAB de ce projet.'));
  }catch{holder.replaceChildren(node('p','Inventaire indisponible ; aucune absence de données n’est déduite.'));}
}
async function refreshCCAB() {
  const holder=$('#ccab-content');holder.replaceChildren(node('p','Chargement…'));
  try {
    const result=await request('/api/ccab');holder.replaceChildren();
    for(const incident of result.incidents) {
      const panel=node('section',null,'panel stats-source');
      panel.append(node('h2','#'+incident.sequence+' · '+incident.incident_id),node('p',date(incident.created)+' · '+incident.state+' · '+incident.reporter,'detail-note'),
        node('p',incident.summary),node('p',incident.change+' / '+incident.run+' · CAB '+incident.version,'detail-note'));
      if(incident.resolution)panel.append(node('p',incident.resolution.classification+' : '+incident.resolution.method));holder.append(panel);
    }
    for(const pending of result.pendingBroker||[])holder.append(node('p','En attente de livraison : '+pending.incident_id+' · '+pending.summary,'detail-note'));
    if(result.unavailable)holder.append(node('p','Service CCAB indisponible ; les entrées locales en attente sont conservées.'));
    if(!result.incidents.length&&!result.pendingBroker?.length&&!result.unavailable)holder.append(node('p','Aucun incident pour ce projet.'));
  }catch{holder.replaceChildren(node('p','CCAB indisponible ; aucun incident n’est supposé résolu.'));}
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
