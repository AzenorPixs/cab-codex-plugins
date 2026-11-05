## 1. Spécification

- [x] 1.1 Valider les deltas OpenSpec et la conception dans le périmètre approuvé.

## 2. Commandes et version

- [x] 2.1 Définir CAB, cab et CABU avec une procédure update unique et distribution cohérente.
- [x] 2.2 Aligner le jeu distribué et les attentes de test sur 1.10.5 sans changer les formats.
- [x] 2.3 Mettre à jour la documentation courante et préserver les archives et le change PLLM.

## 3. Validation finale et clôture

- [x] 3.1 Réussir syntaxe, tests ciblés puis régressions Node/Python et transition isolée.
- [x] 3.2 Réussir les contrôles OpenSpec, cohérence documentaire, UTF-8/LF et périmètre.
- [x] 3.3 Vérifier l’éligibilité à l’archivage et réunir les preuves du rapport STATISTIQUES.md.

## Preuves et revue documentaire

- 1.1 : validation stricte ciblée réussie après réduction des deux exigences ajoutées
  trop longues. Aucune écriture de code/test avant cette validation.
- 2.1 : `node --test tests/controller-service-distribution.test.mjs`, 27 réussis,
  zéro échec ; noms sensibles à la casse, références locales, arguments et procédure unique.
  Ce contrôle structurel des commandes Markdown ne prouve pas leur enregistrement natif.
- 2.2 : trois copies broker identiques, constantes communes 1.10.5 et cachebuster neuf.
  `node --test tests/active-component-update.test.mjs`, 24 réussis après remplacement
  de l'ancienne version inconnue 1.10.5 par la version encore inconnue 1.10.6.
  L'origine 1.10.4 reste explicitement admise. Marqueurs de prompts consommateurs inchangés.
- 2.3 : cadrages et références courants actualisés ; ancien change PLLM identique à
  la baseline locale. Aucun ancien dossier d'archive modifié par cette session.

| Élément | État et preuve |
|---|---|
| AGENTS.md | Inchangé ; empreinte égale à la baseline, règles de session conservées. |
| PROJECT.md | Mis à jour ; version 1.10.5 et section 5.5 avec CAB/CABU/cab. |
| TECHNICAL.md | Mis à jour ; version courante et section 16 décrivant les trois fichiers. |
| BUILD.md | Mis à jour ; jeu des trois commandes, version, repli et qualification isolée. |
| DEVOPS.md | Inchangé ; exécutables déclarés utilisés, aucune dépendance ajoutée. |
| README.md | Mis à jour ; syntaxe canonique, alias et installation distincte de la préparation. |
| CHANGELOG.md | Entrée 1.10.5 de préparation source ; anciennes entrées préservées. |
| openspec/specs/ | Cinq spécifications synchronisées ; blocs conformes aux deltas. |
| ORCHESTRATED_CODING.md et références distribuées | Casse et version courantes actualisées ; protocole métier et formats inchangés. |

Le premier démarrage Chromium a échoué ; le second utilise un TMPDIR plus court
sous le projet et réussit avec Chromium et Firefox. L'image Docker absente a été
récupérée depuis library/debian. Le banc isolé deux UID qualifie 1.10.4 vers 1.10.5,
succès et réponse de déconnexion perdue, avec registre public 5 218 616 octets,
privé 5 657 060 octets, PAUSE et OpenCode conservés et écriture broker refusée
par le noyau. Aucun compte ou droit hôte modifié.

## Validation finale acquise avant archivage

- Suite Node finale : 413 tests déclarés, 388 réussis, zéro échec, 25 ignorés.
  Les 25 scénarios nécessitent un paquet historique 1.7.1 non fourni ; la transition
  courante 1.10.4 vers 1.10.5 est qualifiée séparément à deux UID réels.
- Suite Python : 73 déclarés et réussis, zéro échec. Total interlangages :
  486 déclarés, 461 réussis, zéro échec, 25 ignorés. Les contrôles ciblés recouvrent
  ces suites et ne sont pas ajoutés au total. L'intégration OpenCode native est
  exécutée dans la suite Node finale ; son passage isolé n'est pas additionné.
- Chromium et Firefox : qualification complète réussie. Les premiers échecs
  de démarrage Chromium et d'image Docker absente sont résolus et conservés dans les logs.
- Syntaxe finale : 33 JavaScript par node --check et 11 Python par py_compile.
  OpenSpec standard et strict : 16/16 éléments valides, aucun diagnostic.
- Concordance exacte des exigences synchronisées et des deltas, UTF-8/LF,
  trois copies broker identiques et contrat métier des sous-commandes préservé.
  AGENTS.md, DEVOPS.md et le change PLLM sont identiques à la baseline.
- Inventaire : 71 fichiers existants modifiés, deux commandes et huit artefacts
  OpenSpec créés avant rapport. Les fichiers output sont des preuves locales ignorées.

## Clôture prescrite

Après les tâches préalables ci-dessus : archiver ce seul change déjà synchronisé
avec --skip-specs, vérifier l'archive, produire et vérifier STATISTIQUES.md, puis
appliquer les étapes Git conditionnelles SCM. Ces effets ne sont déclarés accomplis
qu'après leurs preuves ; la préparation de la tâche 3.3 ne vaut pas archivage.
