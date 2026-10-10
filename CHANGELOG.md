# Changelog

Toutes les évolutions significatives de CAB seront documentées dans ce fichier.

## Unreleased

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
