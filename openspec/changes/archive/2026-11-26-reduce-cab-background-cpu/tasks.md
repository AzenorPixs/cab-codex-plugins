## 1. Veilles et métadonnées

- [x] 1.1 Regrouper les événements et éviter les synchronisations de métadonnées inchangées.
- [x] 1.2 Vérifier la détection d'une modification, la perte d'événements et le rattrapage.

## 2. Réconciliations

- [x] 2.1 Cibler la projection des tâches, borner les balayages historiques et conserver les files de reprise MCP.
- [x] 2.2 Vérifier les cadences, les sélections et les contrôles de non-régression applicables.

## Sous-lots normalisés

- `reduce-cab-background-cpu` (code non attribué) — Veilles et métadonnées, tâches 1.1 et 1.2. Validation par événements observés et cas de rattrapage.
- `reduce-cab-background-cpu` (code non attribué) — Réconciliations du service, tâches 2.1 et 2.2. Validation de la projection, des lots de clôture et des reprises MCP.

Le 26 novembre 2026, huit tests ciblés ont réussi. Sur PostgreSQL 17 isolé,
45 tests sur 49 ont réussi. Les quatre échecs du moniteur ont été reproduits
sur CAB 3.47.1 avec la même fixture. Le test d'administration root était
hors de cette fixture non privilégiée.
