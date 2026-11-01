## Implémentation et qualification

- [x] Ajouter le client read-only OpenCode V2 pour lire, lister et rechercher avec session/location scellées.
- [x] Ajouter les routes controller RUN-bound et le helper CLI sans effet métier.
- [x] Refuser chemins absolus, traversal, sources exclues, permission/session occupée, mauvais contenu/encodage et réponses excessives.
- [x] Tester succès, location exacte, dérive de session, refus de chemins, borne de réponse et absence de mutation.
- [x] Aligner CAB/CABU, briques et documentation en 2.1.46 ; exécuter toutes les suites et OpenSpec strict.

## Archivage et livraison

- [ ] Archiver le change et produire un `STATISTICS.md` vérifié.
- [ ] Committer et publier sous SCM.
- [ ] Exécuter CABU 2.1.46 et vérifier les versions/runtime.
- [ ] Vérifier un mandat réel de lecture autorisé dans la session concernée, sans shell ni mutation.
