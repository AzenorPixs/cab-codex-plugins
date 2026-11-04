# Statistiques — CAB 2.2.24

## `/CAB stats`

Accepter exactement stats, statslast, stats 24, stats7 ou stats30, avec au plus une cible --run <run_id>. Les sélections sont current, last, 24h, 7d et 30d. Refuser argument inconnu, cible manquante/dupliquée ou suffixe sans collecte. Consulter uniquement GET /statistics/view?selection=<selection>, avec runId si ciblé et format=markdown si souhaité. Les interfaces historiques /statistics et /runs/<run_id>/statistics restent consultables pour les agrégats et le brouillon à six sections.

Sans cible, présenter chaque change courant séparément ; la dernière sélection exige la dernière livraison observée, pas une publication. Afficher horodatages, sources natives/importées, identités, couverture, dénominateurs, bornes et N/A motivés. Les sources recouvrantes, paires et conditions d'attente ne s'additionnent pas. Les quotas restent partagés ; une variation exige compte/fenêtre/reset comparables. Ne jamais appeler POST, PATCH ou DELETE, démarrer une sonde, modifier le projet, importer automatiquement des données, réveiller un RUN ou créer une surveillance.
