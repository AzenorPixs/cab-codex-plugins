# Tasks

## 1. Spécification
- [x] 1.1 Valider les trois deltas avant code et tests.
## 2. Récupération et corrélation
- [x] 2.1 Ajouter la récupération contrôlée, persistée et exclusive.
- [x] 2.2 Refuser les validations hors session et les anciennes autorisations, préserver la corrélation stricte.
- [x] 2.3 Suspendre le superviseur pendant la récupération.
## 3. Prévention et documentation
- [x] 3.1 Désactiver les outils natifs des mandats lecture seule dans le protocole distribué.
- [x] 3.2 Aligner PROJECT, TECHNICAL, BUILD, README et CHANGELOG ; revoir AGENTS et DEVOPS.
## 4. Validation et archivage
- [x] 4.1 Exécuter tests ciblés et suites applicables, syntaxe et OpenSpec strict.
- [x] 4.2 Vérifier périmètre, UTF-8/LF et cohérence documentaire avant archivage.

## Conditions de clôture après les tâches d'implémentation

L'archivage de ce seul change et la production du rapport STATISTIQUES.md à
six sections, vérifié UTF-8/LF et totaux cohérents, restent obligatoires avant
la restitution terminale. Ces opérations ne peuvent pas être cochées comme
achevées avant l'exécution de l'archive. Aucun skill de télémétrie SCM utilisé.

- Archivage : réussi ; archive 2026-10-08-fix-cab-session-recovery, trois canons synchronisés.
- Rapport d'archivage : STATISTIQUES.md vérifié, six sections, UTF-8/LF et totaux cohérents.

## Preuves avant archivage
- Change ciblé : `openspec validate fix-cab-session-recovery --strict`, réussi.
- Suites : 31 tests Node et 37 tests Python réussis ; contrôles de syntaxe JavaScript, compilation en mémoire des trois modules Python inchangés et manifeste JSON réussis.
- Les premières tentatives des tests ciblés ont signalé une attente incorrecte sur l'endpoint global de santé du mock, puis une transmission temporairement en cours. Corrections ciblées des fixtures/attentes ; aucun verrou affaibli.
- Le strict global échoue sur les longueurs de 13 exigences préexistantes dans six spécifications ; validation standard des sept spécifications réussie avec ces avertissements. Aucun correctif global hors périmètre.
- Revue documentaire : PROJECT §5/7, TECHNICAL §7/8, BUILD §6, README orchestration et CHANGELOG Unreleased alignés. AGENTS inchangé : autorisations, neutralité et reprise du même RUN préservées. DEVOPS inchangé : outils et dépendances préservés. Versions inchangées, aucune release demandée.
- Commande /cab et skill distribuée : contrat de récupération et outils désactivés en lecture seule documentés et contrôlés par test.
- UTF-8/LF : 19 fichiers ciblés contrôlés avant l'ajustement final de BUILD ; contrôle final inclus avant archivage.
- Aucun test de service installé, publication, déploiement, Git, reprise Pixs ou modification des trois anciens changes n'est inclus.

Le premier appel archive --json a refusé sans effet les deux tâches circulaires archivage/rapport. La liste est corrigée pour séparer tâches préalables et conditions de clôture, sans forcer la validation ni présenter ces opérations comme achevées.
