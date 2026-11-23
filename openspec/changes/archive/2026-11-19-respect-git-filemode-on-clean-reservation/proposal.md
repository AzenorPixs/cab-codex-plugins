# Respecter le réglage Git des modes pendant la réservation

Code de lot : non attribué.

Le retour natif de Dev DCAB bis après CAB3.2.22 révèle des chemins absents du
statut courant, identiques aux blobs HEAD, mais refusés car le disque est0770
et HEAD100644 dans un dépôt configuré core.filemode=false.

Le mandat correctif de l'invocation CCAB autorise ce complément ciblé sous SCM,
CICD et CABU. La comparaison conserve l'identité des octets et respecte le
suivi effectif du bit exécutable configuré par Git. Aucune normalisation de
permissions, de configuration, de baseline ou de réservations concurrentes.

La livraison cible3.2.23 ; la future livraison du tableau reste distincte.
