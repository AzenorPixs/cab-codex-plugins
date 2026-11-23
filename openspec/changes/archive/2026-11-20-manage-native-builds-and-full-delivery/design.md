# Conception

CICDF compose un arbre Git dans un index temporaire avant de modifier la version. L’arbre combine les modifications du dossier de travail, l’index commun et les index de session encore actifs. Une modification sur disque est prioritaire lorsqu’un même chemin est aussi indexé. Des versions indexées divergentes, un conflit de fusion ou un effet concurrent non résolu arrêtent l’admission. Les chemins protégés sont exclus. Le moteur vérifie la branche, le commit de base et les entrées partagées avant de déplacer les références. Les index isolés des autres sessions sont préservés.

Le reçu distingue `scope=change` et `scope=project`. Une même demande de version ne peut pas changer de périmètre. Les builds utilisent les constructeurs CAB de la Fabrique et le dossier source habituel. Les étapes de publication restent réservées à DIU. Sans autorisation d’une version DIU compatible avec les tags sans préfixe, la publication est différée et les reçus l’indiquent.
