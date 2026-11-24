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

## Contrat de l’opération

Une demande identifie un projet canonique et une sélection de RUN explicites
ou un change exact. La sélection par change résout les RUN et leurs
générations avant le premier effet. Une attribution ambiguë ou un RUN actif
dans la sélection entraîne un refus de prévol.

La réponse retourne, par brique, `REMOVED`, `ABSENT` ou `PENDING` avec son
diagnostic, puis `COMPLETE` ou `PARTIAL` pour la demande. `ABSENT` exige une
vérification de la brique propriétaire. L’identifiant d’une opération locale
dérive du projet, des RUN triés, de leurs générations et du nom de la brique.
La reprise consulte le reçu correspondant sous un verrou propre à cette
opération. Un résultat confirmé est conservé et rendu sans rappeler
l’adaptateur. Un reçu illisible protège sa brique et les autres poursuivent.
Après une interruption entre effet et confirmation, l’adaptateur réconcilie
son résultat avec le même identifiant et les mêmes conditions de génération.

Le coordinateur historique dispose du stockage des confirmations. L’intégration
sur CAB 3.x utilise le journal PostgreSQL pour l’admission et les confirmations
durables. La preuve terminale du RUN reste disponible jusqu’au dernier retrait.

## Commande CAB 3.x

`cab call session.cleanup` lit un objet JSON sur l’entrée standard. Il reçoit
`project_id`, `request_id`, `confirm_irreversible` à `true`, et exactement un
sélecteur `run_id` ou `change`. Utiliser le même corps et le même `request_id`
pour reprendre. Un identifiant réutilisé avec un autre corps est refusé.

Les données de coordination, les mesures runtime et les incidents résolus sont
traités en transactions distinctes. CAB associe la confirmation à la même
identité et à la même génération de RUN. Les avis utilisés par un pair et les
incidents non résolus restent protégés et apparaissent dans le résultat.
Après ces briques, le retrait de la session réutilise le prévol de suppression
CAB pour retirer ensemble les références qui portent sa preuve terminale.
Les rapports source servent toujours à la projection SGS. L’import historique
consulte le reçu de suppression pour exclure une identité déjà retirée.

Le parcours 2.x signé reste applicable aux anciens reçus, avec ses gardes de
propriétaire et de version. La validation de compatibilité utilise des données
isolées et un reçu du format historique. Une intervention sur un reçu réel
repose sur l’identité, l’accès à la source authentifiable et son état courant.
