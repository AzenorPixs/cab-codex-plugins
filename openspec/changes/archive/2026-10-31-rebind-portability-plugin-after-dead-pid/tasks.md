# Tâches

- [x] 1. Spécifier la reprise du PID et les cas fail-closed.
- [x] 2. Implémenter la liaison au PID courant uniquement après preuve que l’ancien PID est mort.
- [x] 3. Tester PID courant, PID mort, processus encore vivant et vérification impossible.
- [x] 4. Mettre à jour les références et versions, valider OpenSpec, tests, archivage et publication.

## Sous-lots normalisés

Repères provisoires — code non attribué, attribution ACL ultérieure.

| Repère | Tâches | Périmètre | Dépendance | Critère | État |
|---|---|---|---|---|---|
| portability-pid-contract | 1 | OpenSpec | Aucune | Scénarios positifs et négatifs | VALIDÉ |
| portability-pid-runtime | 2, 3 | Plugin CAB et tests | Contrat | Ancien PID mort accepté ; vivant/inconnu refusé | VALIDÉ |
| portability-pid-release | 4 | Documentation/version | Tests | Archive versionnée et vérifiée | VALIDÉ |

Preuves locales du 31 octobre 2026 : [QUALIFICATION.md](QUALIFICATION.md). Tests ciblés et globaux réussis ; activation/version en attente du cycle de distribution CABU.
