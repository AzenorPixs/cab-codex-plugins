# Connexion MCP pending et récupération CABU

Code non attribué ; attribution ACL distincte. Mandat humain SCM, incrément2.1.28 puis CABU et information.

CABU27 a rencontré un raccord pending, puis un repli non confirmé. Un rechargement global explicitement autorisé a conservé OpenCode et ses121sessions ; le même journal a été réconcilié avant installation suivante. Ce retour terrain motive un parcours produit, pas un arrêt d’OpenCode.

Attendre de façon bornée les transitions MCP et ne pas renvoyer connect/disconnect pendant pending. Persister MCP_RECOVERY_REQUIRED sans boucle de repli native aveugle. Reprendre le même reçu si le raccord revient ; si nécessaire, --recover-mcp <transaction> autorise explicitement un unique POSTglobal de rechargement des locations, sous frontière inactive/permissions partagées absentes, avec intention durable, PID/location et identités des sessions globales contrôlés. Une erreur ou réponse perdue n’autorise pas un second rechargement.

Avant coupure, pending reste sans arrêt de services ; après coupure, les services CAB existants sont remis disponibles sans reconstruire le broker en boucle. Après récupération, vérifier artefacts, versions et readiness fraîche pour terminer le même reçu si l’installation est complète ; sinon réconcilier le repli du même reçu et s’arrêter. Profils gelés/reuse-readonly inchangés, récupération globale refusée pour eux.

Updaters/client et tests isolés/natifs, OpenSpec, skill/commandes/référence, cadrages, versions, archive/statistiques et publications. Préserver demandes/once, catalogues, credentials, OpenCode et modèles ; aucun nouveau droit métier.
