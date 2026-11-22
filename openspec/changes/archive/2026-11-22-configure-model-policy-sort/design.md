# Conception

Le tri initial de Tous réutilise le tri manuel du tableau, avec les tarifs à zéro en premier. Les politiques stockent une colonne de tri tarifaire et un sens. Le serveur trie les lignes par tarif numérique, conserve l’ordre du catalogue en cas d’égalité et place les prix inconnus en fin de liste. La recherche conserve cet ordre. La numérotation commence à 1 dans les résultats et continue d’une page à l’autre.

La migration additive initialise les politiques existantes au coût d’entrée croissant. Le retour applicatif peut conserver ces colonnes. L’inversion de la migration retire les réglages de tri enregistrés.
