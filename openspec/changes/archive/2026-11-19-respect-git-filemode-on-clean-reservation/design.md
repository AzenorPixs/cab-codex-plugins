# Conception

clean_at_head lit core.filemode par la commande Git existante, avec conversion
booléenne Git. Une valeur absente conserve le contrôle du mode ; une lecture
invalide refuse. Seul false permet d'ignorer le bit exécutable différent d'un
blob régulier100644/100755. Le contenu reste comparé intégralement par SHA256.
La configuration est relue à la fin et doit rester identique ; le fichier est
revérifié par ses empreintes existantes. Aucun chmod ni git config en écriture.

Les tests couvrent le dépôt false avec modes différents et octets identiques,
le dépôt true avec modes différents, et false avec octets étrangers masqués.
Les fixtures PostgreSQL sont annulées et leurs dépôts Git temporaires détruits.
Le retour natif du même RUN Dev DCAB bis reste requis après CABU.
