## Conception

Le répertoire des jobs est accepté s’il est canonique, ordinaire, possédé par le broker, sans droits autres, et si son groupe est celui du parent possédé par le broker et appartient aux groupes du processus. Le mode 2770 est accepté ; les anciens répertoires privés restent lisibles. Un répertoire nouvellement créé est explicitement porté à 0770 sans changer les répertoires existants.

Les reçus écrits atomiquement sont créés en 0770. Avant lecture d’un reçu existant, ouvrir sans suivre de lien, contrôler type ordinaire, lien unique, propriétaire, groupe et absence de droits pour les autres. Les reçus privés historiques restent lisibles. Le contenu du reçu, son identité, la déduplication et l’interdiction de rejeu restent inchangés. Les processus du groupe qualifié peuvent lire et modifier les fichiers en 0770 ; cette frontière est assumée et ne vaut pas protection contre un autre membre autorisé du groupe.
