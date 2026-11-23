# Archives globales et pagination commune

La route /projects/archives réutilise la présentation des archives par projet et
ajoute la colonne Projets. Le serveur sélectionne dix archives après filtrage
des projets autorisés, ordonne par date/id décroissants et renvoie page, total,
nombre de pages et présence d'une suivante. Une page dépassée est ramenée à la dernière.
Les sessions utilisent le même pas de dix sur le snapshot Electric autorisé.
Les deux listes gardent les liens RUN et actions rattachés au bon projet.

Les archives sont relues à la notification Electric et gardent le rafraîchissement
de secours existant. Les acteurs inactifs ou sans accès ne reçoivent aucune donnée.

# Clôture hôte sans livraison

Une autorité administrative explicite peut déclarer ce mode pour un RUN direct
de développement sans obligation de publication/installation, avec index RELEASED,
aucune réservation ni effet protégé et aucune livraison commencée. Cette décision
ne clôture pas le RUN : le processeur normal exige archive et preuves courantes,
génère/indexe les rapports puis rend CLOSED avec delivered=false. L'index et ses
objets restent conservés ; aucun commit, tag, push ou CI/CD n'est effectué.

Une révision administrative de critères avant qualification conserve ancien
contrat et empreintes dans un événement. Elle interdit opération ou preuve
préexistante, gel, import, revue et effet protégé. Seules les correspondances
de critères changent ; commandes, producteurs et revue restent conservés et une
nouvelle preuve est obligatoire. Ce parcours ne permet pas d'écarter un test passé.
