# Tâches

- [x] Recenser les données, APIs et blocages des briques concernées, y compris C08, C97 et PA10.
- [x] Définir une opération unique à portée explicite et un résultat par brique.
- [x] Implémenter une reprise locale idempotente sans verrou global bloquant les pairs.
- [x] Qualifier sur données isolées la reprise d’un reçu au format historique et la protection des rapports SGS et des pairs.
- [x] Tester le refus des RUN actifs, la conservation des pairs, la reprise et l’absence de réimport sur CAB 3.x.

Preuves des tâches documentaires dans [l’inventaire](TARGETS.md) et la
[conception](design.md).

Qualification du 24 novembre 2026 sur les sources 3.39.0. Le reçu CAB `1202`
confirme 93 tests Node, notamment la reprise d’un reçu historique et la
conservation des pairs. Sur PostgreSQL 17 isolé, 61 tests ont réussi, dont le
passage par `session.cleanup`, le refus avant tout effet sur un change avec
RUN actif, la reprise après résolution d’un incident, le refus d’une nouvelle
génération et l’exclusion du réimport SQLite de l’identité supprimée.

## Livraison et recette sur l’hôte

Après qualification et archivage OpenSpec, suivre le reçu de livraison CICDF,
puis vérifier l’installation de cette version par CABU. Les opérations de
recette sur les cibles réelles figurent dans [l’inventaire](TARGETS.md),
avec les preuves et conditions propres à chaque cible.
