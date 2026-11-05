## 1. Décision et compatibilité

- [x] 1.1 Obtenir la validation du périmètre et du diagnostic proposé.
- [x] 1.2 Inventorier les contrats persistés supportés et leurs champs facultatifs.

## 2. Correction

- [x] 2.1 Ajouter les reproductions des racines invalides et objets incomplets.
- [x] 2.2 Valider le contrat au chargement sans le réinitialiser ni le réécrire.
- [x] 2.3 Compléter les diagnostics et la documentation directement concernée.

## 3. Validation

- [x] 3.1 Vérifier la conservation des contrats historiques valides et l'absence d'interaction externe en cas de refus.
- [x] 3.2 Exécuter séparément les suites restauration, configuration et récupération, et les contrôles de syntaxe applicables.
- [x] 3.3 Valider OpenSpec, examiner le périmètre modifié et présenter les preuves avant toute décision d'archivage ou de release.

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
