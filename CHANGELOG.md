# Changelog

Toutes les évolutions significatives de CAB seront documentées dans ce fichier.

## 1.6.4 — préparation source

- Reprise d'un RUN après STOP et libération réconciliée : la suspension de la
  génération close reste dans l'historique et ne bloque plus sa nouvelle
  réservation par le même propriétaire, y compris après redémarrage.
- Conservation des suspensions actives, gels globaux, contrôles de propriétaire,
  génération, dépendances et ressources ; aucune permission native héritée.
- Régressions registre et HTTP et alignement des briques distribuées sur 1.6.4
  avec cachebuster neuf. Les travaux de monitoring 1.6.3 sont conservés.
- Aucun changement de schéma, migration, publication Git ou activation runtime
  effectué par cette préparation source SCM.

## 1.6.3 — préparation source

- Monitoring préparé ou vérifié dès la résolution du workspace, avant PLLM,
  santé OpenCode et prévols modèle/MCP, y compris en reprise et lors de la
  réutilisation du contrôleur et du superviseur.
- Tentative bornée et preuves unité/page/version/workspace rapportées avant
  les contrôles amont ; une panne amont conserve le service web indépendant.
- Toutes les briques et leurs supports alignés sur 1.6.3 avec cachebuster neuf.
  Aucun déploiement réel, changement de schéma ou migration des RUN actifs.

## 1.6.2 — 20 octobre 2026

- Réconciliation de démarrage : un index local des événements évite les
  relectures complètes du journal pour chaque approbation historique sous le
  verrou du magasin, qui pouvaient faire expirer `broker_readiness`.
- Conservation des contrôles d’intégrité, des expirations persistées avant
  journalisation, des erreurs signalées et des décisions corrélées existantes.
- Régressions synthétiques sur les lectures, réparations, expirations et échecs ;
  alignement des briques distribuées sur 1.6.2 avec un nouveau cachebuster.

## 1.6.1 — préparation source

- /cab start prépare et démarre explicitement le service systemd indépendant
  du monitoring, sans activation au login ; instance conforme réutilisée sans
  redémarrage et configuration existante préservée.
- Identité HTTP publique du workspace pour vérifier service, page et version ;
  URL réelle et erreurs de monitoring affichées séparément du statut CAB.
- /cab stop et les réinitialisations conservent le moniteur et ses connexions
  pour afficher les autres composants indisponibles. Aucun couplage systemd,
  arrêt ou redémarrage implicite des autres briques.
- Jeu source aligné sur 1.6.1 avec cachebuster neuf, tests de distribution et
  paquet isolé complet ; fonctionnalités STATS et purge manuelle conservées.
  Aucun déploiement, service actif, migration ou publication modifié par SCM.

## 1.6.0 — préparation source

- Menu STATS sous MONITOR et page statistique avec sélections courant,
  dernière livraison, 24 h/7 j/30 j et filtre RUN. Sources native/importées
  séparées, couverture et fraîcheur visibles ; cumuls hors fenêtre explicites.
- Purge manuelle des historiques statistiques antérieurs à 1/3/7/30/365 jours,
  avec prévisualisation, jeton expirant, confirmation, recontrôle et reçu par
  magasin. Contextes actifs ou référencés, états opérationnels, preuves et
  agrégats globaux protégés ; fichiers JSON conservés et rétention native
  inchangée à 30 jours. Suppression irréversible sans sauvegarde préalable.
- Imports et écritures sérialisés pendant la purge, remplacements atomiques
  privés et erreurs partielles explicites ; POST locaux protégés contre les
  requêtes interorigine, sans cible arbitraire ni purge automatique.
- Briques, supports et plugin alignés sur 1.6.0 avec cachebuster neuf.
  Préparation source uniquement, sans installation, migration active,
  publication ou opération Git.

## 1.5.0 — préparation source

- Cycle de onze étapes nommé et persistant par job, avec retours explicites,
  historique borné et déclarations concurrentes protégées ; anciens jobs
  sans étape conservés. Le gate terminal et les permissions restent distincts.
- Tableau web ETAT / ÉTAPE / tâches cochées ; phase technique dans le détail,
  catalogue et historique consultables, versions réellement observées de chaque
  brique ; lignes WAITING jaunes et BLOCKED rouges, blocage prioritaire sur
  une attente. Version 1.5.0 conservée, sans installation sur les services actifs.

- CAB Monitor indépendant, sans LLM, sur loopback et port configurable 8790
  par défaut : interface responsive, état des briques, RUN et changes,
  filtres, tâches cochées X/Y, phase observée et chronologie corrélée.
- Flux SSE filtré du contrôleur et diffusion vers les navigateurs, avec
  réconciliation périodique, fraîcheur et ruptures de couverture explicites.
  Journal borné sans commandes, messages ou sorties ; observation sans
  décision, permission, relance ou mutation métier.
- Limite effective de commande dans les statuts publics et sur la page,
  en unités UTF-16 ; défaut 16 384, absence affichée comme indisponible.
- Sources, tests, supports et briques alignés sur 1.5.0 avec cachebuster neuf.
  Modèle de service du moniteur distribué séparément ; aucune installation,
  migration de runtime, publication ou modification des services actifs.

## 1.4.0 — préparation source

- Opérations consommées ou invalidées écartées avant toute nouvelle admission :
  le polling ne réinscrit plus une session historique après sa réconciliation.
  Test de régression sur plusieurs sondages, sans nouvelle permission.
- Limite de commande du contrôleur configurable par
  `OC_Codex_MAX_COMMAND_LENGTH` (alias `OC_CGPT_MAX_COMMAND_LENGTH`),
  16 384 unités UTF-16 par défaut ; `2000` rétablit le seuil précédent.
  Configuration invalide refusée au démarrage et dépassement signalé par
  HTTP 400 JSON avant enregistrement, sur les demandes et rappels historiques
  et par RUN. Diagnostic de notification broker filtré, tests aux bornes et
  règle commande exacte / décision corrélée / permission `once` unique conservée.
- Incrément de 0.1.0 de toutes les briques CAB : broker, modules, contrôleur,
  superviseur, scripts, plugin, commande et unités alignés sur 1.4.0.
  Bloc de concurrence du protocole local synchronisé avec la référence
  distribuée ; schémas, contrats de permission et historiques conservés.
  Cette préparation source ne déploie ni ne publie de composant.

## 1.3.0 — préparation source

- Coordination atomique par ressource : portées déclarées distinctes des accès actifs, lectures compatibles, écritures exclusives, FIFO entre conflits et promotion sûre des fichiers privés. Les RUN indépendants continuent pendant validations, synchronisation, archivage et publication ciblés.
- Révisions et preuves ciblées, suivi des écritures à publier, corrections approuvées dans un ensemble détenu, reçus durables et REPORT. Une fin native inconnue conserve ses protections ; décisions, ask/once et gates restent obligatoires.
- Gel global limité à réconciliation commune, maintenance partagée, pause ou arrêt globaux explicites. Pause/arrêt ciblés et supervision préservent les pairs. Registre schéma 4, migration et sauvegarde privées, retour arrière contrôlé ; anciennes acquisitions d'intégration globale refusées dans resource-scoped-v1.
- Statistiques intégrées de contention et d'exceptions, fenêtres natives 24 h/7 j/30 j, courant et dernière livraison observée. /cab stats, statslast, stats 24, stats7 et stats30 restent en lecture seule. Import local filtré/idempotent de l'audit arrêté, sources séparées, lacunes explicites et quotas partagés comparables.
- Toutes les briques sources, commandes, protocoles et supports de distribution sont alignés sur 1.3.0. Qualification isolée et archivages avec rapports ; aucun Git, déploiement, migration active, propagation interprojets ou intervention sur les RUN actifs.

## 1.2.1 — préparation source

- Ajouter `/cab status` et son filtre exact `--run <run_id>` : tableau français
  horodaté avec réalisé, en cours, restant et statut explicite par RUN.
- Recouper preuves et observations actuelles ; afficher le pair réellement
  bloquant, distinguer orchestrateur actif/codeur idle et écarter les anciennes
  attentes levées. Signaler contradictions et indisponibilités sans déduction.
- Consultation ponctuelle en lecture seule, hors boucle de pilotage, sans
  message, permission, écriture, nouvelle session ou action de cycle de vie.
- Aligner briques distribuées, commande, manifeste, unités et attentes de tests
  sur 1.2.1. Aucun déploiement, migration ou intervention sur les RUN actifs.

## 1.2.0 — préparation source

- Alignement des 14 modules, de pyproject, du manifeste avec cachebuster neuf,
  de la commande `/cab`, des descriptions systemd et des cadrages sur 1.2.0.
- Premier lot de réduction de l'exclusion : préparation avant drainage,
  prochain jalon stable prouvé, diagnostics par RUN via `/integration-status`
  et observations natives regroupées avec recontrôles de divergence.
- Libération publiée et entrée en `REPORT` atomiques via `completion` et
  référence attendue ; reçu durable idempotent, génération renouvelée et
  ressources réduites au seul rapport. Registre schéma 3, lecture 1/2/3,
  interfaces historiques conservées et retour arrière à réconcilier.
- Protocole aligné : validations combinées et publication sous exclusion,
  statistiques et gate après libération. Sources et tests isolés uniquement,
  sans déploiement, migration de RUN actif ni validation sur instantané.
- Schémas broker et protocole MCP inchangés ; archives et références
  historiques conservées. Aucun cache installé, service ou RUN modifié.

## 1.1.0 — préparation source du 2026-10-15

- Alignement demandé des briques, du manifeste, des unités systemd et de la
  commande `/cab` sur `1.1.0`, avec cachebuster neuf pour le plugin.
- Statistiques intégrées au contrôleur : agrégats persistants filtrés, exports
  JSON et brouillon Markdown par contexte, latences médiane/p95, couverture
  inconnue et déduplication SSE, sans RUN d'observation ni appel LLM supplémentaire.
- File FIFO d'intégration, réduction quiescente des ressources et phase
  documentaire après publication pour finaliser le rapport hors exclusion globale.
  Les mandats unitaires, once, rapport vérifié et gate restent obligatoires.
- Cadrages et distribution source alignés ; registre schéma 2 pour les nouvelles
  transitions, lecture des schémas 1/2. Aucun déploiement ni migration de RUN actif,
  aucune publication Git ; les références historiques des correctifs sont conservées.

## 1.0.1 — 2026-10-14

- Garde des permissions natives des jobs armés avant admission, approbation
  manuelle/automatique et transmission de `once` ; refus explicite des règles
  absentes, permissives, invalides ou indisponibles et contrôle de la candidate
  avant prévol. Les décisions consommées et la remédiation CISMP3 existante
  restent préservées.
- Réactivation sûre documentée : `noReply`, PATCH des règles `ask`, lecture
  native puis génération sans réécriture par `tools: true`.
- Alignement des briques distribuées sur `1.0.1` avec cachebuster neuf,
  sans nouvelle dépendance, migration, changement de schéma ou protocole MCP.
  Une règle finale globale `ask` est exigée pour le type natif concerné ;
  les usages sans job armé conservent leur compatibilité. Aucune mise en
  service sur les RUN actifs ; une dérive externe après contrôle reste hors
  garantie atomique de CAB.

## 1.0.0 — 2026-10-13

- Schémas d'architecture fonctionnelle et technique détaillée de PROJECT.md
  et README.md alignés sur les sessions parallèles, le broker unique, les
  réservations, les contextes par RUN et la barrière d'intégration.

- Plusieurs RUN CISMP dans un OpenCode et un broker stdio communs : réservation
  atomique des changes et intentions, ressources en lecture/écriture et dépendances.
- Contextes de jobs, permissions once, décisions, générations, gates et reprises
  séparés ; intégration commune exclusive et libération après preuves.
- Readiness et supervision par RUN ; purge globale refusée si un change reste
  réservé ; pas de redémarrage aveugle par le healthcheck en mode concurrent.
- Commande, skills et distribution actualisés ; prompts pilotés des huit projets
  synchronisés, CISM, CAISM et les prompts directs conservés.
- Compatibilité du mode historique unique. Le profil concurrent utilise un seul
  contexte de répertoire ; worktrees et déploiement restent hors qualification.
- Sources préparées et vérifiées localement ; aucune installation de profil,
  activation de service, opération Git ou publication de release effectuée.

## 0.87.2 — 2026-10-10

- Prévol de récupération divergent : conserver la candidate, le même job, le RUN et le runtime, sans renouvellement ni purge.
- Retry explicite après refus sans effet, identifiants neufs, preuves natives séparées par une frontière vérifiée et gel jusqu'au prévol exact.
- Protocole, cadrages et tests alignés ; version 0.87.2 synchronisée. Le remplacement initial CISMP reste inchangé. Aucun déploiement ni publication.

## 0.87.1 — 2026-10-10

- Correctif source 1.0.2 : retry accepte un refus REJECTED obtenu par
  poll_approval/get_approval après timeout MCP, corrélé à une décision locale
  rejected non consommée. Candidate, job, gel et frontières natives conservés ;
  timeout seul, polling divergent, preuve perdue et effets restent refusés.
- Huit ORCHESTRATED_CODING.md, skill et commande CAB alignés ; arrêt ciblé
  explicite du développeur distingué de retry. Briques distribuées 1.0.2 et
  cachebuster neuf, sans migration, nouvelle dépendance, installation ou
  intervention sur les RUN actifs.

- Corrections ACSM du 2026-10-13 : validation des contrats persistés avant
  HTTP et interactions externes ; refus explicite des racines, structures
  et types invalides, sans divulgation ni réécriture du fichier.
- Statut du superviseur complété par le jalon, le gate observé et un compteur
  persistant des émissions de reprise, conservé au redémarrage et au transfert
  du même job. Ancien compteur inconnu, nouveau job à zéro et émission interdite
  en cas d'échec de persistance ; règles de relance et permissions préservées.
- Deltas actifs rapprochés des références 0.87.2, exigences longues réparties
  sans perte de clauses ou de scénarios et inventaire PROJECT complété.
  Étape initiale de correction sans incrément de version, archivage, publication
  ou déploiement. Les quatre propositions approuvées et les trois changes
  historiques finalisés ont ensuite été archivés le 2026-10-13, chacun avec
  son rapport STATISTIQUES.md vérifié ; les références restent inchangées.

- Correction CGP-20261010-05 à 07 : le gate refuse les demandes locales
  indécises même avec un ancien compteur broker nul ; le healthcheck et le
  superviseur acceptent la même URL de base ou `/status`, avec les alias
  historiques et le slash final.
- Activité SSE corrélée à la session du job : trafic étranger, heartbeats et
  trames non exploitables ne retardent plus sa reprise. L'ancienne activité
  est invalidée lors d'un changement de contexte ; gel de récupération et
  décisions unitaires préservés, sans migration ni nouvelle dépendance.
- Régressions isolées avec services simulés ; version source 0.87.1 conservée,
  sans publication, installation de profil ni intervention sur un service réel.

- Récupération automatique orchestrée après prévol divergent ou incomplet
  prouvé et refusé sans effet, notamment champs et délais prescrits omis.
  Le double écart `true` / `change_id` n'est plus requis ; une nouvelle
  divergence sûre renouvelle la procédure sans terminer le RUN parent.
- Checkpoint métier, identifiants neufs, prévol exact, décisions explicites
  et gardes de purge conservés. Un délai MCP seul reste traité par polling ;
  effets inconnus, preuves absentes ou purge partielle bloquent la reprise.
- Briques versionnées alignées sur `0.87.1`, nouveau cachebuster du plugin,
  tests de protocole et de refus HTTP. Aucun nouvel endpoint, schéma,
  déploiement, purge réelle ou publication.

- Protocole des sessions pilotées extrait vers ORCHESTRATED_CODING.md dans
  les huit projets et templates possédant AGENTS.md. Les règles générales
  imposent la lecture du document local ; les contrats techniques, cadences,
  mandats, récupération et clôture y sont regroupés. Les tests de distribution
  vérifient le renvoi et le contenu dédié, sans déclencher de session pilotée.
  Le document est facultatif à l'échelle du projet et réservé aux besoins de
  pilotage ; son absence ne bloque pas les autres projets ou les sessions directes.

- Correction CGP-05 : seule l'absence de `controller-job.json` autorise un
  démarrage sans job. Un JSON malformé ou une autre erreur de lecture refuse
  désormais le démarrage avant HTTP et les interactions avec les composants
  pilotés, avec un diagnostic sans contenu persistant ni chemin runtime.
- Contrats valides, gel, sessions révoquées et fichiers en erreur préservés ;
  aucune réparation automatique, migration ou nouvelle dépendance.
- Tests isolés de restauration et de non-divulgation, puis alignement des
  composants versionnés sur `0.87.0` avec nouveau cachebuster du plugin,
  sans installation de profil, déploiement de service ni changement de schéma.

- Exception de protocole après récupération CAB échouée prouvant `true` au
  lieu de `/usr/bin/true` et un `change_id` divergent : nouvelle session CAB
  autorisée après neutralisation du contexte et purge des deux espaces runtime
  résolus, checkpoint métier et preuves préservés hors purge.
- Nouveau job et prévol exact avec le bon change avant reprise au premier
  jalon non prouvé, sans rejouer les écritures validées. Les reprises ordinaires
  restent sans purge ; gardes, API et outil de purge inchangés. Versions
  distribuées alignées sur `0.86.9`, sans déploiement ni purge réelle.

- Protocole CAB : benchmark PLLM retenté toutes les 30 minutes sans limite
  jusqu'à reprise sûre du même RUN ou arrêt explicite ; checkpoint des
  tentatives, supervision maintenue et contrôles CAB requis avant reprise.
- SSE en temps réel et contrôle des demandes/rapports toutes les 3 secondes ;
  vérifications de progression pendant analyse/rédaction espacées de
  7 secondes fixes, indépendamment de la boucle CAB.
- Sondes statistiques toutes les 30 minutes sans arrêter le travail pour
  attendre le créneau ; leur échec reste distinct d'un échec du benchmark PLLM.
- Alignement des briques distribuées sur `0.86.8` avec nouveau cachebuster du
  plugin et contrôles de distribution. Évolution du protocole de
  l'orchestrateur sans nouvel automate PLLM ni déploiement de service.

- Récupération explicite de session dans le même job par `/job/recover`, en
  deux phases avec contexte et prévol natif vérifiés. Jalons, périmètre et
  corrélation stricte conservés ; anciennes autorisations invalidées, gate
  ouvert et gel persistant en cas de preuve manquante.
- Refus des validations hors session, suspension du superviseur pendant le
  prévol et verrou des outils natifs pour les mandats lecture seule.
- Tests HTTP isolés de récupération, de refus, de concurrence et de reprise.
  Correctif source sans publication, installation ni nouvelle dépendance.
- Alignement du broker, du contrôleur, du superviseur, du plugin, de la
  commande `/cab` et du projet sur `0.86.7` pour ce correctif, avec nouveau
  cachebuster du plugin. Schémas de persistance et protocole MCP inchangés.

- Rappels en mode manuel : aucun thread ni tour Codex auxiliaire ; la
  décision reste réservée à l'orchestrateur principal sur l'interface HTTP.
  Mode automatique, corrélation et consommation unique préservés.
- Régression HTTP des rappels répétés, de l'absence de RPC Codex et de la
  décision explicite unique. Incrément de toutes les briques versionnées
  de `0.86.5` à `0.86.6`, sans changement des schémas ni du protocole MCP.
- Nouvelle session CAB : purge complète de l'ancien runtime, incluant
  approbations, journal, checkpoints, jobs, rappels et conflits Syncthing.
  La persistance reste assurée pendant un RUN et sa reprise.
- Outil de purge distribué avec le plugin, contrôles d'inactivité et de
  verrou avant suppression, refus des cibles invalides et protection des
  fichiers extérieurs. Nouvelle session maîtresse et test CAB obligatoire.
- Alignement du protocole AGENTS, de la skill, de `/cab start` et des cadrages.
- Incrément des briques CAB de `0.86.4` à `0.86.5` ; schémas et protocole MCP
  inchangés. Suppression historique sans sauvegarde acceptée ; aucune
  publication ou modification Syncthing incluse.

## 0.86.4 - 2026-10-05

- Recherches de présence indexées dans les appels de liste d'approbations :
  une seule lecture initiale d'un journal cohérent remplace les relectures
  par approbation sous le verrou du magasin, même si la réponse est filtrée.
- Index local à chaque appel et actualisé après écriture durable réussie ;
  expirations, réparations, erreurs, intégrité des append et résultats préservés.
  Aucun accès au journal pour un magasin vide.
- Tests isolés de liste, d'idempotence, de persistance et d'erreurs, avec une
  fixture représentative et un contrôle déterministe du nombre de lectures.
- Alignement du broker, du contrôleur, du superviseur, du plugin, de `/cab`
  et de `pyproject.toml` sur `0.86.4` ; schémas et protocole MCP inchangés.

## 0.86.3 - 2026-10-03

- Recherches d'événements indexées dans la première boucle de réparation
  post-crash : un journal déjà cohérent n'est plus relu pour chaque
  approbation avant l'initialisation MCP.
- Index temporaire actualisé seulement après une écriture durable réussie ;
  récupération synchrone, contrôles de cohérence et d'intégrité, verrous et
  autres réparations conservés.
- Tests isolés de récupération, d'idempotence, d'erreurs et d'initialisation
  MCP, avec contrôle du nombre de lectures du journal.
- Alignement du broker, du contrôleur, du superviseur, du plugin, de `/cab`
  et de `pyproject.toml` sur `0.86.3` ; schémas et protocole MCP inchangés.

## 0.85.3 - 2026-09-29

- Option booléenne `strictCommands` dans le contrat de job, persistée et
  exposée dans son état public. Pour la session et le répertoire concernés,
  seule la commande exacte approuvée est corrélée ; tout suffixe, y compris
  l'instrumentation de sortie OpenCode, reste sans approbation native.
- Le comportement instrumenté existant est conservé lorsque l'option est
  absente ou vaut `false` ; les valeurs non booléennes sont refusées.
- Tests HTTP du refus des suffixes, de l'approbation de la commande exacte,
  de la consommation unique et de la compatibilité du mode existant.
- Alignement du broker, du contrôleur, du superviseur, du plugin et de `/cab`
  sur `0.85.3` ; versions de schéma et protocole MCP inchangées.

## 0.85.2 - 2026-09-29

- Intégration de `coding-session-statistics` au plugin CAB, avec lecture native
  des quotas Codex et sans dépendance à Tools Codex ou au skill `cgpt`.
- Le protocole impose un `STATISTIQUES.md` par archive OpenSpec réussie, avec
  relevés finaux après archivage et preuve du rapport avant clôture normale.
- Données absentes explicites et reprise d'un rapport échoué sans réarchivage.
- Alignement du broker, du contrôleur, du superviseur, du plugin et de `/cab`
  sur `0.85.2` ; aucun changement des versions de schéma ou de protocole MCP.

## 0.85.1 - 2026-09-25

- `/cab update` installe ou actualise atomiquement le superviseur et son unité
  systemd utilisateur, sans activer ni démarrer le service.
- Son résumé compare désormais aussi les versions distante et locale du
  superviseur.
- Alignement du broker, du contrôleur, du superviseur, du plugin et de `/cab`
  sur `0.85.1`.

## 0.84.4 - 2026-09-23

- Le contrôleur exige désormais un gate terminal local avant une clôture CAB
  normale et expose son état via `/status`.
- Le gate refuse une clôture sans état terminal explicite, sans readiness
  broker ou avec validation active ou en attente.
- Alignement du broker, du contrôleur, du plugin et de `/cab` sur `0.84.4`.

## 0.84.3 - 2026-09-21

- `/cab start` vérifie avant toute session persistante que le fournisseur, le
  modèle et le niveau de raisonnement configurés dans OpenCode répondent
  effectivement dans un prévol sans outil ni accès au projet.
- En cas de preuve absente ou divergente, CAB publie `CAB_INACTIF` sans lancer
  de session pilotée.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.3`.

## 0.84.2 - 2026-09-21

- `/cab update` affiche les versions GitHub et locales du plugin CAB, du
  contrôleur, du broker actif et de la commande CAB.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.2`.

## 0.84.1 - 2026-09-21

- `/cab update` migre de façon réversible la marketplace CAB locale vers sa
  source GitHub, actualise son instantané puis réinstalle le plugin si nécessaire.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.1`.

## 0.84.0 - 2026-09-21

- `/cab update` synchronise la commande de profil avec
  `AzenorPixs/cab-codex-plugins` au lieu d'une source incorrecte.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.0`.

## 0.74.0 - 2026-09-19

- `/cab update` vérifie désormais aussi la commande CAB du profil Codex face à
  `AzenorPixs/tools-codex` et la remplace atomiquement si GitHub est plus récent.
- Alignement du broker, du contrôleur et du plugin sur la version `0.74.0`.

## 0.73.0 - 2026-09-19

- Ajout de `/cab update`, qui compare la version du plugin CAB et celle de sa
  marketplace avant de déléguer une mise à niveau nécessaire à Codex.
- Alignement du broker, du contrôleur et du plugin sur la version `0.73.0`.

## 0.72.1 - 2026-09-14

- Le contrôleur corrèle désormais une commande Bash lorsque OpenCode ajoute
  uniquement son instrumentation de sortie déterministe reconnue.
- Toute autre transformation de commande reste non corrélée et ne reçoit pas
  de permission native.
- Alignement du broker, du contrôleur et du plugin sur la version `0.72.1`.

## 0.72.0 - 2026-09-14

- Le contrôleur démarre désormais en mode de décision `manual` par défaut afin
  que l'orchestrateur conserve la décision corrélée de chaque mandat.
- Alignement du broker, du contrôleur et du plugin sur la version `0.72.0`.

## 0.71.0 - 2026-09-14

- Documentation du contrôleur CAB supervisé par le service utilisateur
  `cgpt-approval-bridge-controller.service`, avec redémarrage automatique et
  sans processus éphémère pendant un RUN.
- Alignement de la commande `/cab` sur ce même service pour `start` et `stop`.
- Alignement du broker, du contrôleur et du plugin sur la version `0.71.0`.

## 0.69.1 - 2026-09-14

- Le contrôleur accepte désormais toute racine de projet absolue fournie au
  démarrage, sans liste codée en dur de projets pilotés.
- Conservation des protections existantes : exécution hors sandbox déclarée et
  interface HTTP limitée au loopback.
- Alignement du broker, du contrôleur et du plugin sur la version `0.69.1`.

## 0.69.0 - 2026-09-14

- Le mode de décision manuelle du contrôleur devient le comportement par défaut,
  pour conserver les mandats PENDING jusqu'à une décision HTTP corrélée de
  l'orchestrateur.
- Conservation du mode de décision automatique existant, de la corrélation
  `requestId` / `approval_id` / `change_id` et de la consommation unique des
  permissions OpenCode.
- Alignement des versions du broker, du contrôleur et du plugin sur `0.69.0`.

- Correction de la validation des mandats unitaires : une commande unique peut
  désormais être validée avec une liste `files` vide.
- Passage à des mandats unitaires : Codex pilote et valide chaque opération
  OpenCode, y compris l’archivage OpenSpec ; CAB ne transmet qu’une décision
  corrélée à une permission native unique.
- Alignement du plugin, de la commande `/cab` et des cadrages sur la session
  OpenCode persistante et l'état MCP natif `/mcp`.
- Correction de la documentation des variables du broker vers les noms
  effectivement implémentés `CGPT_*`.
- Uniformisation de la terminologie utilisateur sur Codex, tout en conservant
  les identifiants techniques historiques `cgpt-validation` et `CGPT_*`.
- Établissement du socle OpenSpec des capacités CAB.
- Normalisation de l'arborescence du plugin Codex.
- Déplacement de la marketplace Codex et du plugin à la racine du dépôt pour la distribution GitHub privée.
- Réparation du contrat HTTP du contrôleur local.
