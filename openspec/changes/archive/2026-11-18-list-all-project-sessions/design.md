# Sessions globales de la zone Projets

ProjectsNavigation sert à l'accueil et à /projects/sessions. La route statique
Sessions est distincte de la route dynamique d'identifiant de projet.
SessionList et SessionRows partagent la présentation, les liens RUN, les tâches,
les états et les actions avec les pages de sessions par projet. En global,
chaque groupe ajoute l'identifiant lisible du projet lié à son accueil.

Le flux /api/v1/sync/project-sessions utilise la projection existante. Un admin
reçoit toutes les sessions non archivées ; les autres acteurs restent limités
à leurs projets autorisés. Les paramètres SQL/table envoyés par le client ne
remplacent jamais la portée serveur. Les sessions archivées restent hors tableau.

Une réservation peut reprendre un fichier modifié mais déjà libéré par le même
acteur et la même session native : vérifier index conservé, empreinte du reçu,
référence de protection et concordance du contenu avant toute reprise. Les
modifications nouvelles ou les fichiers d'une autre session restent refusés.
Les réservations sont prises au report, puis libérées après contrôle et indexation.
