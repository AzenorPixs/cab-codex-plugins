## Sous-lots normalisés

Code non attribué ; repère `add-reusable-project-statistics`. Attribution et
normalisation définitive par ACL ultérieure ; aucun code inventé.

## 1. Contrat et extraction — VALIDÉ
Objectif : schéma stable et extraction traçable. Périmètre moteur et référence.
Dépendances : bibliothèque standard Python. Critères : fixtures narratives,
preuves et cas contradictoires ; tâches 1.1–1.2. Preuves à compléter.
- [x] 1.1 Définir et implémenter contributions, preuves, extraction et revue.
- [x] 1.2 Produire/amender les rapports de change et importer les observations CAB.

## 2. Calcul et publication — VALIDÉ
Objectif : reconstruction, delta et reprise. Dépend du1. Critères : exactitude,
idempotence, exclusion mutuelle, interruption et frontières ; tâches2.1–2.2.
- [x] 2.1 Implémenter calcul, rendu, code actuel, transaction et vérification.
- [x] 2.2 Tester les reprises, les chemins exclus et le delta sans autres lectures.

## 3. Distribution et qualification — VALIDÉ
Objectif : brique CAB distribuée et SGS intégré. Dépend du2. Critères : skill,
commande MAJUSCULE, documentation cohérente et statistiques CAB ; tâches3.1–3.3.
- [x] 3.1 Distribuer skill/commande et adapter SGS et ses points d'appel.
- [x] 3.2 Régénérer et vérifier le couple CAB avec revue du corpus.
- [x] 3.3 Qualifier globalement et préparer la synchronisation, l’archivage et les statistiques du change.

## 4. Réconciliation et brique Web — VALIDÉ
Objectif : corriger les écarts de qualification autorisés et exposer la brique
Statistiques avec version/état. Périmètre : tests et nettoyage ciblés, preuve
courante distincte de l'historique, collecte locale VERSION et carte Web.
Critères : gardes conservées, tests de non-régression, disponibilité sans calcul
et vérification Chromium/Firefox. Cette unité précède la validation finale3.3.
- [x] 4.1 Réconcilier les gardes/tests et les preuves courantes sans réécrire une archive.
- [x] 4.2 Afficher version et état SGS dans le moniteur et distribuer ses dépendances.
- [x] 4.3 Valider les contrôles ciblés, l'intégration et les navigateurs déclarés.

## 5. Interface agnostique — VALIDÉ
Objectif : même interface CLI/JSON pour tout agent de codage ou orchestrateur,
en session directe ou pilotée, sans dépendance au protocole CAB.
- [x] 5.1 Accepter les identités d’agents libres dans les preuves et le registre.
- [x] 5.2 Fournir QUERY sans mutation, global/change et filtres de mesure ; conserver INSPECT pour les rapports ouverts.
- [x] 5.3 Vérifier agents tiers, absence, incohérence, transaction et concurrence.

## Preuves — 5 novembre 2026

Voir [QUALIFICATION.md](QUALIFICATION.md), [STATISTICS.md](STATISTICS.md) et
[SESSION_OBSERVATION.json](SESSION_OBSERVATION.json).
Python global :185tests réussis, dont49SGS. Node global :1284réussis,
31ignorés,0échec. Chromium et Firefox : qualification réussie. Contrôle
OpenSpec global strict21/21. REBUILD génération6 :176archives, contratSGS1.19.
Les prérequis de clôture sont vérifiés ; archivage, rapport final et DELTA
suivent dans le cycle SCM sans être anticipés par ces coches.

## Cycle de clôture après validation

Le libellé initial3.3 regroupait validation et opérations post-validation.
La tâche3.3 porte sur leurs prérequis vérifiés ; synchronisation/archivage et
production du même rapport interviennent ensuite dans le cycle SCM, sur preuve,
sans coche anticipée d’un archivage ou d’une publication.
