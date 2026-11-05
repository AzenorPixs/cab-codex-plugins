## 1. Décision

- [x] 1.1 Valider les champs publics, la portée et la sémantique du compteur ainsi que la valeur historique inconnue.

## 2. Correction

- [x] 2.1 Ajouter les reproductions HTTP des champs absents et des changements de job.
- [x] 2.2 Publier les jalons et gates réellement observés avec leur contexte de réconciliation.
- [x] 2.3 Persister le compteur et maintenir la compatibilité des anciens états.
- [x] 2.4 Actualiser uniquement la documentation du statut et du compteur.

## 3. Validation

- [x] 3.1 Vérifier succès, échec, préparation abandonnée, gel, redémarrage, transfert de session et nouveau job.
- [x] 3.2 Exécuter séparément la suite superviseur et les suites de compatibilité pertinentes, puis la syntaxe et OpenSpec.
- [x] 3.3 Examiner l'absence de changement des permissions et règles de relance, puis présenter les preuves avant toute release ou clôture.

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
