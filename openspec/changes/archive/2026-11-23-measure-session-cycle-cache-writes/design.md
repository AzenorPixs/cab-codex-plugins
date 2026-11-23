## Collecte et stockage

Lire l’incrément de `cache_write_input_tokens` dans les relevés Codex et `tokens.cache.write` dans les messages OpenCode terminés. Stocker le résultat dans une colonne nullable. Préserver l’identité des mesures Codex déjà enregistrées lorsqu’elles sont relues. Un champ absent reste indisponible et un zéro fourni est affiché comme tel.

## Projection

Réutiliser les agrégats et la synthèse persistée du RUN. Afficher Tw après Tr dans les tableaux et les cumuls, ainsi que dans Informations. Le retour à la version précédente du schéma retire uniquement la nouvelle colonne.
