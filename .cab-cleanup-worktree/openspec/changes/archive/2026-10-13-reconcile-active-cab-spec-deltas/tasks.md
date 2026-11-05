## 1. Décision

- [x] 1.1 Faire valider le rapprochement proposé et la conservation des trois changes historiques ouverts.

## 2. Rapprochement

- [x] 2.1 Reprendre les deux exigences courantes du gate sous MODIFIED, avec tous leurs scénarios.
- [x] 2.2 Reprendre les trois exigences statistiques intégrées sous MODIFIED.
- [x] 2.3 Reprendre l'exigence de distribution en 0.87.2 et dater les nouvelles notes d'état sans réécrire les preuves historiques.
- [x] 2.4 Vérifier l'identité du delta de prévol modèle avec sa référence sans modifier son état.

## 3. Validation

- [x] 3.1 Comparer les exigences et scénarios rapprochés avec leurs références.
- [x] 3.2 Exécuter les validations OpenSpec standard ciblées et distinguer collisions, longueurs et erreurs.
- [x] 3.3 Vérifier UTF-8/LF et l'absence de modification de code ou d'archives closes.
- [x] 3.4 Présenter les preuves ; laisser toute décision d'archivage et de rapport associé distincte.

## Validation après application — 2026-10-13

Validation explicite du développeur reçue pour les quatre propositions.
Implémentation et documentation appliquées aux sources, références et deltas
actifs synchronisés. Les exigences désormais présentes dans les références
sont conservées sous MODIFIED dans les changes ouverts, sans archivage.

- Restauration : 27 tests réussis, dont les refus de racines et types invalides,
  le fichier intact, l'absence d'HTTP/OpenCode/Codex et le format minimal compatible.
- Superviseur : 11 tests réussis, dont statut, compteur, redémarrage, transfert,
  historique inconnu, échec avant émission et refus d'émission sans persistance.
- Récupération : 16 tests réussis ; configuration et décisions : 13 ;
  compatibilité des clients : 6 ; distribution : 13. Total Node : 86/86.
- Régressions Python : 38/38 via l'interpréteur de DEVOPS.md.
- Syntaxe des deux scripts et deux suites JavaScript modifiés : réussie.
- OpenSpec strict : 14/14 éléments valides, sans avertissement ni collision.
- Treize correspondances éditoriales vérifiées clause par clause par comparaison
  textuelle normalisée ; tous les scénarios d'origine conservés à l'identique.

Les suites Node sont exécutées séparément par fichier ; HTTP est simulé en
loopback, avec TMPDIR dans .test-tmp du projet. Le sandbox refusant listen,
les suites HTTP ont été autorisées hors sandbox. Aucun service réel CAB ou
OpenCode, profil, secret, dépendance, version ou élément Git modifié.
Les changements restent ouverts ; release, déploiement et archivage ne sont
pas exécutés et demandent leurs décisions distinctes.
