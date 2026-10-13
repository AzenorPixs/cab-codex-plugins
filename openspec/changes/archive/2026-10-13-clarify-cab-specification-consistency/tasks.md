## 1. Décision et équivalence

- [x] 1.1 Valider le périmètre éditorial et la correction de l'inventaire PROJECT.md.
- [x] 1.2 Revoir la correspondance de chaque obligation et scénario entre références et deltas proposés.
- [x] 1.3 Confirmer le rapprochement préalable des deltas historiques, sans les archiver implicitement.

## 2. Application documentaire

- [x] 2.1 Appliquer le découpage des treize exigences sans changement de sémantique.
- [x] 2.2 Actualiser les deltas actifs concernés en conservant leur état et leurs preuves historiques.
- [x] 2.3 Ajouter persistent-job-supervision à l'inventaire de PROJECT.md, sous une revue documentaire distincte.

## 3. Validation

- [x] 3.1 Vérifier la matrice de correspondance, les titres uniques et la conservation de tous les scénarios.
- [x] 3.2 Exécuter OpenSpec strict sur les références et changes actifs ; distinguer tout écart préexistant non concerné.
- [x] 3.3 Exécuter les tests de distribution en lecture seule et vérifier UTF-8/LF ainsi que l'absence de modification de code ou d'archives.
- [x] 3.4 Présenter les résultats avant toute décision séparée de synchronisation finale, d'archivage ou de rapport d'archive.

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
