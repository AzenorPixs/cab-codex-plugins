# Choix techniques

Lire seulement les listes de chemins absolus et champs Interpréteur/Installation de DEVOPS.md, sans exécution de commande ni chargement de project.env. Un fichier absent/invalide est visible dans le catalogue ; pas de découverte globale de la machine. Les préfixes bin/lib garantissent le chargement des interpréteurs, notamment symlink venv vers Python DevOps. Les chemins système déjà montés ne sont pas dupliqués. Les chemins larges et espaces privés sont refusés ; secrets/sockets sont masqués par noms et métadonnées, sans lecture.

Les ressources externes gardent leurs accès CAB existants. Un socket Docker n’est jamais passé à une commande atelier : son API permettrait une écriture hôte/projet. Le réseau reste isolé ; une exécution distante ou web utilise un mandat CAB distinct. Le catalogue décrit la voie requise au lieu de simuler une disponibilité.

La même identité de reçu ne relance rien après régénération DEVOPS. Les nouvelles exécutions recalculent le catalogue et consignent son empreinte. Les reçus existants ne sont ni écrasés ni réinterprétés.
