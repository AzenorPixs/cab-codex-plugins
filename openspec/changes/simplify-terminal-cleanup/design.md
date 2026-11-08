# Conception

Le développeur choisit le projet et le RUN ou change. CAB vérifie les RUN actifs
de la cible, puis supprime les données par attribution explicite à cette cible,
via chaque brique propriétaire. Un résultat compact indique, par brique, ce qui
est retiré et ce qui reste à reprendre. La commande n’exige ni reconstruction
des preuves métier ni recherche dans l’historique CAB ; OpenSpec et les fichiers
projet restent intacts. Les ressources et décisions d’un pair ne sont pas
traitées comme des appartenances de la cible sur la seule base d’un identifiant
secondaire ou d’un nom de change commun.

La progression et la reprise sont indépendantes par brique : un composant
indisponible ne verrouille ni les autres suppressions ni leurs RUN. Une demande
répétée reprend la même opération ; elle ne rejoue pas une permission ou une
commande métier. Les formats historiques sont pris en charge par une migration
ou une projection bornée. Le reçu C08 déjà figé est un cas de compatibilité à
qualifier sans supposer son issue ; les autres suppressions indépendantes ne
doivent pas attendre ce reçu.

Le pilote utilise l’identité de contexte du contrôleur comme génération du RUN ;
chaque brique la recontrôle au moment de son effet. Une nouvelle génération ne
réutilise pas le résultat de la précédente. Un état actif ou inconnu est refusé
pour la seule cible concernée.

Le développeur peut demander la suppression de données CAB de changes clos ou
stoppés sans validation supplémentaire. Un RUN actif ciblé est refusé. Les
rapports et statistiques sources du projet, notamment OpenSpec, ne sont pas
supprimés. Les résumés globaux déjà validés et les sessions étrangères sont
conservés. Les statistiques runtime de la cible ne sont pas réimportées depuis
un ancien rapport lors d’un futur RUN.
