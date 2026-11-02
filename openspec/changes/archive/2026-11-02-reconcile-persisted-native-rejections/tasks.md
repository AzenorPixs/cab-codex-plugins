## Réconciliation

- [x] Vérifier et sceller le rejet natif exact à partir d’un transcript stable et quiescent.
- [x] Persister atomiquement le rejet, son empreinte et l’état `CANCELLED` sans accès.
- [x] Restaurer le même rejet idempotemment après redémarrage, sans appel natif.

## Qualification et documentation

- [x] Ajouter les tests positifs, négatifs, d’idempotence et de redémarrage.
- [x] Mettre à jour OpenSpec, la documentation CAB et la version commune 2.1.67.
- [x] Exécuter les tests Node/Python, les vérifications syntaxiques et OpenSpec strict.
