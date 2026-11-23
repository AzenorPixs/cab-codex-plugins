## 1. Reprise et choix du sens de synchronisation

- [x] 1.1 Afficher l’observation et permettre sa confirmation explicite sur un reçu, une configuration et des références stables.
- [x] 1.2 Permettre un nouvel aperçu dans l’Overview et vérifier que la clôture ne provoque aucun envoi.
- [x] 1.3 Proposer les deux sens pour les trois forges et vérifier l’alignement de la branche et des tags locaux sur une forge.

## Sous-lots normalisés

### Clôture du reçu incertain et nouvel aperçu

Les tâches 1.1 à 1.3 relèvent du change `allow-fresh-forge-sync-after-divergence`. Code non attribué. La qualification couvre le reçu incertain, le nouvel aperçu, le choix du sens et une synchronisation inverse sur des dépôts temporaires.

Le 23 novembre 2026, 23 tests Python ont passé. Les échanges Git ont vérifié les deux sens pour les trois forges de test et le refus d’écraser un fichier non commité. Chromium et Firefox ont vérifié la clôture sans envoi et l’aperçu inverse sur chaque forge.
