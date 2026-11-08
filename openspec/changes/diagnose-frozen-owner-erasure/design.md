# Conception

Le diagnostic doit réutiliser les mêmes validations et projections que le
commit, mais sans appeler de fonction qui crée une clé, prépare des écritures,
applique un plan ou modifie un verrou persistant. Il doit authentifier la
transaction, vérifier son propriétaire et son scope, et conserver la même
erreur de sécurité pour les conflits réels. Sa sortie doit être bornée à une
classe de garde et à des compteurs ou empreintes non sensibles. Les états
incertains et les RUN pairs restent inchangés. Les points d’entrée et les
garanties de lecture seule restent à qualifier avant toute exécution réelle.
