# Conception

La table PostgreSQL conserve un incrément natif horodaté par ligne, dédupliqué par source native et projet. Codex utilise les différences entre compteurs cumulatifs et OpenCode les messages assistant terminés. Le rapprochement utilise la date native de la mesure, sans fractionner un événement. Les fenêtres d’étape et d’action sont semi-ouvertes. Si plusieurs actions d’une étape se recouvrent, le compteur reste dans le cumul de l’étape. Les mesures dépourvues d’une borne native exploitable restent inconnues. Les écritures dans le cache demeurent disponibles dans la télémétrie existante.

La somme des incréments par fenêtre fournit les valeurs affichées. Une actualisation du RUN et des étapes signale aux flux Electric autorisés que le détail des cumuls doit être relu. La table brute demeure privée. La migration inverse supprime les nouvelles mesures, qui peuvent être recalculées tant que les sources natives existent.

Les mandats complémentaires sont conservés dans la configuration du RUN et journalisés avec un identifiant de demande idempotent. Le reçu d’initialisation conserve la liste effectivement validée à sa date. L’ajout requiert l’autorité directe ou pilotée déjà reconnue et l’autorisation explicite du développeur. CABU reste une action externe au cycle.
