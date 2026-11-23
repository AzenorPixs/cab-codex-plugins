## 1. Réconciliation des forges

- [x] 1.1 Réconcilier les reçus incertains sur observation exacte, conserver les preuves et refuser les résultats divergents ou les opérations actives.
- [x] 1.2 Exposer l’action dans les deux fenêtres et qualifier les parcours backend et navigateur.

## Sous-lots normalisés

### Vérification des références d’un envoi incertain

Les tâches 1.1 et 1.2 relèvent du change `reconcile-uncertain-forge-operations`. Code non attribué. La qualification couvre les références et la conservation du reçu, puis la fenêtre qui propose cette vérification.

Le 23 novembre 2026, 21 tests Python ont réussi, dont la comparaison de branche, l’égalité des tags, la conservation du reçu et les refus sur concurrence ou divergence. Chromium et Firefox ont vérifié les deux fenêtres, l’absence d’envoi et la reprise par un nouvel aperçu explicite.
