## Implémentation et qualification

- [x] Persister séparément l'issue native et conserver les digests/comptabilités historiques.
- [x] Reclassifier les opérations terminales héritées uniquement après relecture native unique et concordante.
- [x] Autoriser `NO_EFFECT` seulement après erreur native corrélée, absence d'écriture réussie et révisions inchangées.
- [x] Refuser écritures réussies, preuves absentes/dupliquées/divergentes, révisions modifiées et effets inconnus.
- [x] Tester fin en erreur, absence de bump/pendingWrite, erreur en contexte Code Mode et rejeu idempotent.
- [x] Aligner versions communes, commande, skill, documentation et cartographie sans références à un projet piloté.
- [x] Exécuter les suites complètes Node/Python et OpenSpec strict ; vérifier syntaxe, copies broker et diff.

## Archivage et livraison

- [ ] Archiver le change et produire un `STATISTICS.md` vérifié.
- [ ] Committer et publier sous SCM avec incrément de version.
- [ ] Exécuter CABU et vérifier versions/runtime.
- [ ] Informer le propriétaire du RUN concerné de la disponibilité de la restitution après ses vérifications, sans rejouer l'édition.
