# Conception

Conserver le document de configuration interface de PostgreSQL et sa
projection existante. Les personnalisations de composants et de Général
sont réparties par identifiant de profil dans profile_styles. Les facteurs
d’adaptation restent dans responsive, déjà structuré par profil.

Les réglages précédemment enregistrés servent de défauts hérités. Une
écriture sous verrou modifie uniquement le groupe et le profil ciblés.
La largeur réelle de la fenêtre gouverne le rendu. Pour une dimension
continue disposant de deux valeurs, le navigateur interpole entre elles.
Les valeurs discrètes suivent le profil le plus proche.
