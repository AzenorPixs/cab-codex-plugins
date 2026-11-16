# Conception — code non attribué

Un moteur vivant à la version cible n’est pas redémarré simplement parce que le catalogue client n’a pas encore été relu. La politique côté service protège aussi les anciens relais déjà chargés ; si une commande native est disponible, elle reste prioritaire. L’état de reconnexion attend une preuve réelle et ne marque pas le catalogue comme lu.
