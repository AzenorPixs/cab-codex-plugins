# CAB 2.4.0 — autonomie, statistiques et correction coordonnées

Code non attribué ; convergence ACL ultérieure. Mandat SCM avec CI/CD explicitement confirmé après validation des huit catégories de la fiche préparatoire et compléments.

## Why
Les correctifs successifs ont révélé un couplage excessif des décisions, statistiques et données transitoires, des projections ambiguës et des hypothèses mono-compte. Le cleanup C12 SEALED est bloqué car contrôleur et broker utilisent des comptes distincts. CAB doit offrir un fonctionnement autonome direct ou piloté, une collecte fiable et un diagnostic centralisé, en réduisant temps, tokens et sollicitations humaines.

## What Changes
- Reprendre le même cleanup C12 via effacement exécuté par chaque propriétaire système et échanges locaux authentifiés ; aucune copie de clé privée, modification de propriétaire ou suppression manuelle des états.
- SGS permanent systemd : collecteurs natifs Codex/OpenCode pour codeurs/orchestrateurs, chronologie modèles/fournisseurs/raisonnement, temps/attentes/tokens/cache, déduplication, provenance et reprise. Les LLM complètent uniquement les données non natives. Toutes les briques transmettent leurs statistiques à SGS ; reprise des rapports archivés.
- CCAB permanent et distribué en plugin/skill/commande : incidents directs/pilotés, FIFO par défaut, lots communs justifiés, affectation à un orchestrateur mandaté, coordination et résolution vérifiée ou faux positif sourcé. Documentation seule suit aussi SCM/version/DIU/CABU.
- Autonomie dans le change ; validation orchestrateur préalable des écritures projet hors zone de test et des accès web, validation des résultats de tests. Développeur pour actions hors change ou allocations supplémentaires. Atelier .cab-tests propre au projet/change/RUN, libre en écriture, nettoyé en fin.
- CAB direct activé explicitement : suivi Codex/SGS/WebMonitor/CCAB, sans OpenCode ou orchestrateur fictif. Contrat complet versionné, connu des acteurs au démarrage/reprise/update ; états compacts et attente mécanique hors LLM.
- WebMonitor : suivi des modes, Stats exclusivement SGS, CCAB dédié, Archives fidèles aux fichiers/rapports stockés, consultation et suppression développeur sans nouvelle approbation. Les RUN en cours restent protégés ; les RUN clos peuvent être nettoyés sans blocage dû aux seuls formats anciens.
- CABU prépare à chaud, bascule sélective et continuité/idempotence, installation des nouveaux services et collecteurs, versions effectivement chargées et métriques distinctes. Révisions effectives exactes sans réagrégation des parents déjà agrégés.

## Impact
Un seul change actif, lots séquentiels liés ; fichiers code/broker/scripts/web/systemd/plugins/skills/commandes, tests vitaux et cadrages strictement concernés. Les chemins, secrets et identités privés restent sous leur compte ; protocoles précédents et transactionC12 repris en avant. Publication2.4.0 par DIU après qualification, archive et SGS, puis CABU et contrôles runtime. Le périmètre C12 reste ses seuls deux RUN ; les autres nettoyages relèvent du mandat séparé du développeur.
