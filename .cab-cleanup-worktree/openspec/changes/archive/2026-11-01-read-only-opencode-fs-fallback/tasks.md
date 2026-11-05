## Implémentation et qualification

- [x] Ajouter le client read-only OpenCode V2 pour lire, lister et rechercher avec session/location scellées.
- [x] Ajouter les routes controller RUN-bound et le helper CLI sans effet métier.
- [x] Refuser chemins absolus, traversal, sources exclues, permission/session occupée, mauvais contenu/encodage et réponses excessives.
- [x] Tester succès, location exacte, dérive de session, refus de chemins, borne de réponse et absence de mutation.
- [x] Corriger le démarrage du helper depuis son lien stable distribué et restituer une cause contrôleur filtrée sans fuite de message.
- [x] Accepter les types MIME textuels servis par OpenCode, ignorer l’entrée de racine et normaliser uniquement les chemins absolus restant dans la location.
- [x] Aligner CAB/CABU, briques et documentation en 2.1.50 ; exécuter toutes les suites et OpenSpec strict.

## Archivage et livraison

- [x] Archiver le change et produire un `STATISTICS.md` vérifié.
- [x] Committer et publier sous SCM.
- [x] Exécuter CABU 2.1.50 et vérifier les versions/runtime.
- [x] Vérifier un mandat réel de lecture autorisé dans la session concernée, sans shell ni mutation.
