## Implémentation et qualification

- [x] Ajouter `NOT_ADMITTED` comme état terminal non décisionnel et événement d’audit dédié.
- [x] Terminaliser les diagnostics de notification HTTP déterministes uniquement ; préserver les échecs inconnus et transitoires.
- [x] Réconcilier au poll les anciens reçus `PENDING` portant déjà un diagnostic déterministe.
- [x] Tester 400/409 connus, diagnostic malformé/inconnu, 5xx/timeout, absence de décision et absence de retry.
- [x] Aligner les briques CAB/CABU et la documentation en 2.1.45 ; exécuter toutes les suites et OpenSpec strict.

## Archivage et livraison

- [x] Archiver le change et produire un `STATISTICS.md` vérifié.
- [x] Committer et publier CAB 2.1.45 sous SCM.
- [x] Exécuter CABU 2.1.45 et vérifier les versions et états runtime.
- [x] Vérifier que le même approval 03 devient `NOT_ADMITTED`, sans décision, et libère le RUN pour une nouvelle demande à révisions courantes.
