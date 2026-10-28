# STATISTIQUES — SCM CAB 2.0.0

## 1. Cadre, autorisation et identité

Projet : Codex Approval Bridge (`cab`), racine `/home/devops/datas/cab`.
Session directe SCM, périmètre validé : migration exclusive des briques CAB
vers OpenCode V2, version CAB majeure 2.0.0, authentification HTTP Basic par
credential privé et refus définitif d'OpenCode 1.x. Rapport produit le
2026-10-28T01:54:52Z. Modèle, durée totale, nombre de messages et compteurs
d'outils : N/A, non mesurés de façon exhaustive pour cette session SCM directe.
Aucune télémétrie périodique de session ni quota n'a été collecté.

## 2. Réalisations et périmètre

Le client natif commun valide `/api/info`, exige OpenCode V2, Basic Auth avec
le nom fixe `opencode`, et lit le secret depuis un fichier local protégé ou
`LoadCredential` systemd. Contrôleur, supervision, SSE, healthcheck, Monitor,
maintenance, réparation et métadonnées utilisent les routes V2. La preuve
d'effet transcript exige `executed: true`. Les permissions et sessions sont
corrélées selon les schémas V2. Toutes les briques distribuées annoncent la
version de base CAB `2.0.0`.

Les contrats et documents de projet ont été adaptés; les spécifications
OpenSpec ont été consolidées et le change archivé sous
`openspec/changes/archive/2026-10-28-support-opencode-v2-only-transport`.
Les unités utilisateur reçoivent le secret via `LoadCredential`. Aucun
redémarrage ni déploiement des unités CAB ou du service OpenCode actif n'a été
effectué.

## 3. Tests et validations observés

| Contrôle | Résultat | Total et limites |
| --- | --- | --- |
| Suite Node (`node --test tests/*.test.mjs`) | Réussie | 451 cas : 425 réussis + 26 ignorés = 451 ; 0 échec |
| Test natif OpenCode | Réussi | 1 test contre le binaire V2.2.0 dans un processus isolé et credential synthétique |
| Suite Python | Réussie | 73 tests, 0 échec |
| Syntaxe Python | Réussie | 9 fichiers compilés par `py_compile` |
| Web Monitor navigateur | Réussie | Chromium et Firefox headless |
| OpenSpec strict avant archivage | Réussie | 15 éléments, 0 échec |
| OpenSpec strict après archivage | Réussie après correction des exigences longues et du Purpose | 15 éléments, 0 échec |

La sonde authentifiée du service actif n'a pas été exécutée : le fichier local
de credential est absent. La lecture non authentifiée de `/api/info` a retourné
HTTP 401. Aucun secret n'a été lu. Le test natif isolé confirme la compatibilité
avec le binaire V2.2.0, mais ne qualifie pas l'authentification du service actif.

## 4. Déploiement et versions réellement observées

Le relevé DIU existant dans `DEVOPS.md` indique le binaire
`/home/devops/.opencode/bin/opencode` en version 2.2.0; le test natif isolé a
observé la même version. Une régénération DEVOPS par DIU a été tentée mais a
échoué avant toute écriture : accès refusé à `/root/diu/config/diu.env`.
Le fichier généré n'a pas été modifié manuellement.

Le service OpenCode déjà actif a été laissé inchangé. Le runtime CAB installé
n'a pas été déployé ni redémarré. Les versions installées des plugins CAB et
l'état des unités runtime : N/A, aucune inspection ou mutation n'a été réalisée
dans ce périmètre SCM.

## 5. Durées et mesures disponibles

Suite Node : 23.734 s. Durées exactes des tests Python et navigateur, durée
totale SCM, temps de rédaction, consommation de jetons, quotas et répartition
des messages/outils : N/A, aucune télémétrie exhaustive fiable n'ayant été
collectée. Les suites Node, Python et navigateur ne sont pas additionnées.

## 6. Clôture, traçabilité et limites

Les tâches du change sont cochées et l'archive a été créée. Les validations
OpenSpec strict avant et après archivage passent avec 15 éléments et zéro
échec. Les spécifications principales décrivent désormais exclusivement le
transport OpenCode V2 et la version CAB 2.0.0.

Une erreur de commande antérieure avait lancé `node --test` sans limiter le
répertoire et inclus des copies historiques sous `output/`; ce résultat n'est
pas retenu. La suite de référence limitée à `tests/*.test.mjs` a réussi. Le
commit et les publications distantes ne sont pas affirmés dans ce rapport; ils
seront consignés séparément après contrôle Git conditionnel du prompt SCM.
Le rapport comporte six sections en UTF-8/LF.
