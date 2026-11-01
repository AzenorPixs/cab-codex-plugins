## Implémentation et qualification

- [x] Adapter `complete` des RUN legacy non signés pour réconcilier une unique discovery native exacte à toute position dans le transcript post-prepare.
- [x] Conserver le rejet strict des RUN signés, des duplications, preuves invalides et autres outils inattendus.
- [x] Ajouter des tests isolés positifs et négatifs couvrant discovery avant `request_validation`, intégrité du préfixe, horodatages, troncature et absence de mutation en cas de refus.
- [x] Exécuter les suites applicables : JavaScript 700 cas, 669 réussis, 0 échoué, 31 ignorés ; Python 83/83 ; OpenSpec strict ciblé valide.

## Documentation et archivage

- [x] Mettre à jour la référence CAB de récupération native et documenter la compatibilité legacy sans référence à un projet consommateur.
- [x] Incrémenter CAB/CABU, plugins, quatre briques, commandes et tests à la version commune 2.1.38.
- [x] Mettre à jour le changelog et synchroniser les spécifications principales à l’archivage.
- [x] Archiver le change et produire son rapport `STATISTICS.md` vérifié.
