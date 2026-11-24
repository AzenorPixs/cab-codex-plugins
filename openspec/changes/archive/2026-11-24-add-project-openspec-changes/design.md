# Conception

Conserver une identité CAB par identifiant OpenSpec dans la table changes.
Projeter une entrée visible par source locale pour préserver les archives
successives qui portent le même identifiant. Réutiliser les chemins sûrs,
empreintes et données des tâches du catalogue existant. Le calendrier du
catalogue est persistant et distinct du calendrier de génération des rapports.

La projection initiale et la Shape Electric utilisent les mêmes données
publiques. La route contrôle le projet côté serveur et fixe les colonnes
publiées. L’action par ligne relit les sources de cet identifiant et modifie
uniquement leur projection. Une observation partielle ou une source instable
préserve la dernière projection complète et sera réessayée.

La migration ajoute des champs qu’il est possible de retirer. Les rapports,
les fichiers OpenSpec et les identités historiques restent en place. Le
catalogue peut être reconstruit depuis les fichiers déclaratifs.
