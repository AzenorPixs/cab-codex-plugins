# Contrôle borné et données candidates privées

Le scope signé reste l’autorité utilisée par le canal propriétaire. Le scope
effectif a les mêmes projet/change/RUN et contient les identifiants attestés
par le broker, puis ceux découverts par la projection. Il sert aux recherches,
statistiques et preuves d’absence. Le certificat conserve les deux portées.

Les fichiers candidats ne contiennent que les états après projection. Sous le
répertoire privé de mise à jour, un dossier déterministe du reçu porte des
fichiers numériques0600 et leurs SHA-256/tailles dans le reçu HMAC. Les anciens
lecteurs rencontrent une empreinte avant incompatible et refusent avant toute
écriture. Le nouveau lecteur vérifie racine privée, UID, type, liens, taille et
empreinte ; un candidat déjà appliqué n’est pas relu ni rejoué.

La préparation ne remplace que des candidats régénérables non référencés par
un reçu actif. Après application et absence vérifiées, entries est vidé et le
snapshot des pairs remplacé par son digest avant RESTARTING. Les candidats sont
retirés avant remise en ligne et après reprise d’une interruption à cette phase.
