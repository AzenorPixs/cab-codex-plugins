# Réduire le CPU des tâches de fond CAB

Le service relit régulièrement des données stables. Les mesures sur CAB 3.47.1 montrent des coûts dans Python, les connexions PostgreSQL du service et ses sous-processus.

Le change `reduce-cab-background-cpu` (code non attribué) cible la veille OpenSpec, la synchronisation des métadonnées de projet, la projection des tâches, l'examen des clôtures historiques et la convergence des connecteurs MCP. Les tests vérifient la réactivité, les rattrapages et la conservation des protections. La comparaison CPU après activation couvre aussi Electric, les auxiliaires et les connecteurs.
