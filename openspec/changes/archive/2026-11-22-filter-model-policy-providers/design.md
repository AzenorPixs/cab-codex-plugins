# Conception

Les politiques enregistrent une liste d’identifiants ou une valeur nulle pour le mode Tous. Une liste vide n’inclut aucun fournisseur. Le serveur valide les identifiants sélectionnés et limite la requête des modèles à ces fournisseurs. Une suppression de fournisseur retire ses modèles. Les identifiants d’anciens fournisseurs sont ignorés à la lecture du catalogue.

La migration additive initialise les politiques existantes en mode Tous et conserve les autres paramètres. Revenir au code précédent peut laisser la colonne en place. Inverser la migration retire les sélections.
