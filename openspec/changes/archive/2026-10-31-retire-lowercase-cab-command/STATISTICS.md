# Statistiques — retrait de l’alias minuscule CAB 2.1.33

## 1. Statistiques générales et décisions

SCM directe ; un agent Codex, mandat développeur pour converger vers `/CAB`,
retirer `cab.md` et aligner CAB/CABU sur 2.1.33. Aucun sous-agent. Modèle exact,
niveau de raisonnement, durée exhaustive, tokens et coût : N/A, non instrumentés.
Code de lot non attribué ; attribution ACL ultérieure.

## 2. Types de messages et d’outils

Lectures ciblées, édition, validation OpenSpec, tests et contrôles de
cohérence. Totaux exhaustifs de messages et d’appels d’outils : N/A, non
instrumentés. Aucune permission native réelle consommée.

## 3. Fichiers modifiés

Commande CAB/CABU, documentation de cadrage et de distribution, plugins,
modules broker, scripts CAB, unités systemd, tests, OpenSpec et cartographie.
Nombre exhaustif d’écritures et de fichiers distincts : N/A.

## 4. Commandes et vérifications

| Campagne finale | Réussis | Échoués | Ignorés |
|---|---:|---:|---:|
| Node global, 688 cas | 657 | 0 | 31 |
| Python global | 81 | 0 | 0 |
| `py_compile` des neuf fichiers Python modifiés | 9 | 0 | 0 |

| Validation OpenSpec | Réussies | Échouées |
|---|---:|---:|
| Ciblée stricte avant archivage | 1 | 0 |
| Changes/specs stricts avant archivage | 1 | 0 |
| Changes/specs stricts après archivage | 1 | 2 |
| Archives avec tâches cochées | 1 | 0 |

Six invocations strictes ont été exécutées : quatre réussies et deux ont
signalé un requirement trop long après synchronisation ; sa formulation a été
raccourcie puis la validation complète a réussi. Les contrôles finaux ont
validé 16 changes/specs et 104 archives. Cinq tâches OpenSpec sont prouvées et
terminées (5/5). Les exécutions ciblées ont servi au diagnostic et ne sont pas
additionnées à la suite globale. Une première suite Node a révélé la version
2.1.32 antérieure omise et des attentes textuelles obsolètes ; après correction,
les tests ciblés et la suite globale finale ont réussi. Nombre exhaustif de
commandes : N/A.

## 5. Accès web

Aucun outil de recherche web. Les tests ont utilisé leurs serveurs HTTP locaux
de fixture. Nombre d’accès web externe : 0.

## 6. Synthèse globale

La commande unique `/CAB` est distribuée avec `/CABU` en entrée de mise à jour ;
le fichier source `cab.md` est supprimé. La synchronisation globale sauvegarde
l’ancienne entrée et restaure l’ensemble précédent si la publication échoue.
Les versions source des plugins, composants, commandes et cadrages sont
alignées en 2.1.33. Les suites Node et Python ainsi que les validations
OpenSpec passent. L’archive est créée ; commit, publications, synchronisation
du profil et activation CABU restent en cours de SCM et ne sont pas déduits des
preuves source.
