# Qualification — CAB 2.1.32

31 octobre 2026. Le plugin conserve ses règles de session et ne change le PID lié que si l’ancien PID est prouvé absent (`ESRCH`). Un PID encore vivant, inaccessible ou dans un état indéterminé est refusé. La liaison se fait en mémoire ; aucun fichier runtime de projet suivi n’est modifié par le module.

- Tests unitaires contexte portable : 6 réussis, dont ancien PID absent, PID vivant, statut inconnu, limites et isolation des règles.
- Tests du contrôleur/concurrence : 139 réussis.
- Node global final : 657 réussis, 0 échec, 31 ignorés (688 cas).
- Python global : 81 réussis.
- OpenCode privé exact 2.2.0 : 4 réussis.
- OpenSpec global strict : 17/17 avant archive. Syntaxe du module vérifiée.

Une première suite globale a expiré sur une fixture et contenait des attentes de version non migrées ; ces attentes ont été actualisées, le contrôleur/concurrence est passé isolément et le Node global final séquentiel a réussi.
