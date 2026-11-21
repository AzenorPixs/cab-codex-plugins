# Contrat de récupération

Un lot de synchronisation UNKNOWN peut être réconcilié si son unique rapport
en attente porte sur l’ancien chemin, désormais absent, d’un change archivé.
Le fichier cible était initialement absent. L’entrée indexée doit rester
identique à HEAD en contenu et en mode et être attestée par un reçu CAB achevé
avant le lot. Tous les rapports déjà achevés doivent encore correspondre à
leurs reçus dans le dossier de travail et dans l’index. La décision reste
sous les verrous existants et vérifie l’arrêt de l’écriture. CAB conserve le
reçu UNKNOWN original, classe le reste sans effet, puis permet aux traitements
suivants de reprendre sans relancer le lot original.
