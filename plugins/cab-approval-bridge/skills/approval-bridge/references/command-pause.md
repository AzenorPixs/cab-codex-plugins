# Pause et reprise — CAB 2.2.36

## Suspension ciblée ou globale

Une cible --run <run_id> est locale. Lire GET /runs et la génération, puis POST /runs/<run_id>/suspend avec version, action PAUSE, STOP ou RESUME et références non secrètes de l'autorité/evidence. PAUSE/STOP ferme les nouvelles admissions ; conserver les effets et protections jusqu'à leur frontière sûre. RESUME exige leur réconciliation et ne réutilise aucune permission. STOP ne prouve ni livraison ni gate TERMINÉ : suivre le gate/arrêt ciblé autorisé sans arrêter les services des pairs.

--all exprime une demande globale explicite. PAUSE/STOP utilise /coordination/global/request avec cause GLOBAL_PAUSE ou GLOBAL_STOP, scope=all, transactionId, authorization et evidence. Terminer/réconcilier les effets connus sans nouvelle sous-opération, puis /coordination/global/confirm après vérification de toute la cohorte. Une fin inconnue conserve le gel. RESUME vérifie l'état courant, les preuves et le prévol nécessaires puis /coordination/global/release avec transaction/génération et autorisation de reprise. Aucun timeout ne libère le gel ; une pause propre à un RUN reste prioritaire après reprise globale.

Maintenance ou réconciliation de l'infrastructure partagée exigent leur autorité explicite et les causes SHARED_MAINTENANCE ou GLOBAL_RECONCILIATION. Ne jamais utiliser une exclusion globale pour une validation, publication ou un conflit ordinaire. Fermer/redémarrer OpenCode exige une demande distincte. Un arrêt partagé conserve les gates/protections ; une nouvelle session exige une réconciliation autorisée du gel avant toute purge, dont les refus existants restent applicables.
