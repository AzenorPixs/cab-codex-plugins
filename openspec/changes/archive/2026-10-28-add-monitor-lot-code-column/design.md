# Conception

Le collecteur ajoute `lotCode` (chaîne ou null) à la vue de chaque change. Le premier titre Markdown de niveau 1 non inclus dans un bloc de code et non indenté est la source ; un code composé de 1 à 10 lettres majuscules puis 2 à 4 chiffres est accepté seul ou suivi d'un séparateur explicite « — », « – », « - » ou « : » et d'un intitulé. Aucun code n'est recherché au milieu du texte, dans tasks.md ou dans l'identifiant de dossier. Les lectures bornées et sans suivi des liens restent inchangées.

Le frontend ajoute la cellule après l'identité et avant l'état/emplacement. Pour un RUN, il consulte le change corrélé déjà présent dans le snapshot ; pour un change, il lit directement lotCode. null ou champ absent donne une chaîne vide via textContent. Le snapshot n'est pas muté ; le tri existant et la recherche restent identiques.

La base commune 2.1.2 conserve la cohérence exigée des modules et de la distribution. Les archives, preuves runtime et références historiques ne sont pas réécrites. Retour arrière : rétablir les sources précédentes ensemble ; aucune migration de données. L'installation active n'appartient pas à ce mandat.
