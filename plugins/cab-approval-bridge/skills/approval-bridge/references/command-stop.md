# Arrêt — CAB 2.2.35

## `/CAB stop`

1. Avant tout arrêt normal, appelle `POST /runs/<run_id>/job/terminal-gate` du contrôleur avec l'état terminal explicite `TERMINÉ` ou `BLOQUÉ`. Si le contrôleur refuse le gate, ne clôture pas le job et reprends le pilotage ou restitue le blocage observé. Après un gate validé, désarme le contrat correspondant par `POST /runs/<run_id>/job/disarm`. Cette vérification est distincte d'un arrêt forcé explicitement demandé par le développeur.
2. Supprime tous les heartbeats et cron healthchecks créés par `/CAB`, dont « Surveillance CAB ».
3. Ferme les flux SSE ouverts par `/CAB`.
4. Arrête explicitement le superviseur démarré par `/CAB` avec `systemctl --user stop cgpt-approval-bridge-supervisor.service`, puis arrête explicitement et proprement le contrôleur avec `systemctl --user stop cgpt-approval-bridge-controller.service`. Ne désactive ni ne supprime leurs unités : elles restent installées mais inactives jusqu’au prochain `/CAB start`.
5. Ne tente pas d’arrêter directement `cgpt-validation` : son cycle de vie appartient à OpenCode.
6. Ne ferme jamais OpenCode sauf instruction explicite du contexte initial ou du développeur.
   Préserver explicitement `cgpt-approval-bridge-monitor.service`, sa configuration, ses sources et ses connexions propres : le moniteur reste disponible après cet arrêt. Son arrêt nécessite une demande distincte ; aucune erreur de monitoring ne justifie un arrêt ou redémarrage des autres composants.
7. Affiche le bilan : éléments arrêtés, éléments préservés et éventuelles erreurs. Inclure le statut et l’URL du monitoring conservé, ou son diagnostic d’indisponibilité.
