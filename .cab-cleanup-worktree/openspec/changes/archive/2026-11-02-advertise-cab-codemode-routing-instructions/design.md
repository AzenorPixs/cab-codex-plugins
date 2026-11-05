# Conception

Le serveur ajoute un champ `instructions` standard à la réponse MCP
`initialize` et un préfixe aux descriptions des outils. OpenCode transmet ces
instructions au prompt système ; le message exige la discovery exacte, le
wrapper `execute` et l'absence de nom deviné ou de repli shell. Aucun appel
natif n'est exécuté par cette guidance. Les clients autres qu'OpenCode ne sont
pas astreints au wrapper Code Mode.
