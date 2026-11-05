# CO03 — CAB 1.3.0 — coordination atomique par ressource

## Why

Les réservations longues et la barrière d'intégration actuelle suspendent des RUN indépendants. CAB doit coordonner les accès réellement incompatibles aux fichiers et autres ressources, en réservant l'exclusion globale aux situations exceptionnelles de réconciliation commune, maintenance, pause ou arrêt globaux.

## What Changes

- Conserver l'attribution durable et exclusive du change et de sa clé d'intention ; distinguer le périmètre déclaré du RUN de ses accès actifs.
- Attribuer atomiquement tous les verrous d'une opération sur les ressources partagées : lectures compatibles, écriture exclusive, aucune acquisition partielle.
- Éviter les verrous temporaires supplémentaires sur les fichiers dont l'usage exclusif est prouvé ; organiser leur passage en ressources partagées si un autre RUN les déclare.
- Protéger les validations sur leurs entrées et effets réels. `openspec validate --all --strict` protège le périmètre OpenSpec utile, sans suspendre les écritures indépendantes hors de ce périmètre.
- Publier et archiver avec des protections ciblées, des preuves associées aux révisions utilisées et un reçu durable ; ne réconcilier que les validations ou dépendances affectées.
- Réserver le gel global à une réconciliation de l'état commun, une maintenance de l'infrastructure commune, une pause globale ou un arrêt global explicitement cadrés. Une pause ou un arrêt ciblés restent locaux au RUN.
- Conserver décisions explicites, permissions natives `ask`/`once`, mandats unitaires, reprise sans rejeu, statistiques d'archive et gates terminaux.
- **BREAKING** : remplacer la suspension systématique des pairs, la file globale d'intégration et l'invalidation systématique par `referenceVersion`. Les appels historiques incompatibles sont refusés sans effet dans le nouveau profil, avec indication de migration.
- Préparer une release cohérente **1.3.0 de toutes les briques CAB**, ainsi que les protocoles, skills, commandes et outils distribués.

## Capabilities

### New Capabilities

Aucune : les contrats sont portés par les capacités CAB existantes.

### Modified Capabilities

- `concurrent-run-coordination` : périmètres, exclusivité prouvée, verrous temporaires, files par conflit, publication ciblée et exceptions globales.
- `approval-workflow` : identité d'opération et manifeste immuable associés à la décision, contrôle des accès avant permission.
- `approval-persistence` : persistance des protections, générations, opérations et reçus sans libération sur timeout.
- `controller-transport` : API locale de coordination, contrôle avant `once`, statut ciblé et gate sans effet non résolu.
- `persistent-job-supervision` : attente de ressource, reprise et pause/arrêt limités à leur cible.
- `supervision-remediation` : readiness et diagnostics des conflits, sans remédiation globale implicite.
- `native-session-statistics` : attentes par ressource et exclusions exceptionnelles mesurées séparément.
- `codex-integration-distribution` : cohérence 1.3.0, négociation de capacité, migration et protocoles distribués.

## Impact

Broker Python, routeur et journal ; contrôleur, contextes de job, registre et verrou de registre ; superviseur et contextes ; client SSE, healthcheck, statistiques, outils de purge et de synchronisation des prompts ; plugin, catalogue, unités, commande `/cab`, skills et références ; cadrages et tests. La matrice détaillée figure dans `design.md`.

Le développeur a étendu explicitement le cycle à l'implémentation et à la clôture de `integrate-observation-statistics`. Ses fonctions sont livrées dans le jeu source 1.3.0 ; les deux changes sont qualifiés puis archivés séparément avec un rapport chacun, sans réactiver le job d'audit arrêté.

## Statut et autorisation

**PÉRIMÈTRE SCM VALIDÉ le 16 octobre 2026.** Le développeur autorise l’implémentation source de toutes les briques CAB 1.3.0, les tests, la documentation, la synchronisation et l’archivage de ce seul change avec son rapport. Aucune action Git, propagation interprojets, installation, migration active, intervention sur les RUN actifs ou déploiement n’est autorisée. Voir PERIMETRE-SCM.md.
