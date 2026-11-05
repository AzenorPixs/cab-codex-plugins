# Fermer la distribution de permission-policy

Code non attribué ; attribution ACL ultérieure. Correctif de livraison indispensable au mandat humain SCM de contrôle ask, incrément final2.1.30 puis CABU/information. Aucun nouveau comportement de permissions.

CABU29 a révélé l’absence du module permission-policy dans le groupe monitorScripts de l’updater, alors qu’il existait dans le paquet et la procédure autonome. Le reçu update-8e1d1a80-d0cd-47be-a09f-b9c5d13a3a88 est terminalROLLED_BACK ; aucune29réputéeactive. La validation des imports ne vérifiait que les chemins sources globaux, pas leur destination réelle.

Ajouter le module au groupe du moniteur et contrôler chaque import relatif statiquement déclaré contre sa source ET sa destination déployée. Tests d’import du client depuis le moniteur réellement installé, et dépendance présente dans le groupe primaire mais absente du groupe moniteur, refus avant coupure. Mettre à jour versions/cadrages/README/CHANGELOG, OpenSpec, rapports et suivi ; conserver archives29 et preuves d’échec. Pas de changement de règles, modèle, configuration ou template.
