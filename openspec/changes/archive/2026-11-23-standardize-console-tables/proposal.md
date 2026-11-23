## Pourquoi

Les tableaux de la console CAB présentent des typographies, des tailles de page
et des commandes de navigation différentes. Certains ne permettent aucune
recherche.

## Changements

- Partager la typographie de Binaires et afficher au moins trois lignes dans
  chaque corps de tableau, même en l’absence de résultats.
- Proposer partout la navigation Premier, Précédent, Suivant et Dernier, avec
  dix résultats au plus par page et la recherche à droite de Dernier.
- Filtrer toutes les données accessibles de la vue avant pagination, notamment
  pour les archives et les incidents paginés côté serveur.
- Limiter à dix les tailles de page de la console, y compris pour les
  préférences existantes. L’API conserve sa compatibilité de pagination.

## Périmètre

Console Web, préférences d’apparence, API de lecture des archives et incidents,
tests ciblés et spécification de la plateforme.
