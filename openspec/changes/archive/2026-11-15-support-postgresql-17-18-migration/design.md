# Parcours PostgreSQL Debian

Référence postgresql={major,cluster,port} dans /etc/cab/cab.json. Le serveur
réel est vérifié par SQL et confronté à pg_lsclusters ; la cible vient de
postgresql-common/supported-versions et doit être installée et supportée.
L'adoption d'une installation existante relève le serveur sans le recréer.

Avant Django et Electric, sous verrou fichier système (pas dans les projets),
seul le cluster cab local exclusif peut être migré. Aucun client actif, opération
non terminale ou bail actif : sinon refus. Vérifier le retour des commandes,
la version et l'intégrité de toutes les tables et séquences CAB, les rôles,
publications et réglages logiques. Sauvegarder cluster et configuration avant
pg_upgradecluster --method=dump. La méthode logique reconstruit les index et
évite le partage de fichiers avec l'ancien cluster.

Un reçu durable précède le dispatch ; un crash pendant l'effet laisse une
réconciliation requise sans rejeu. Aucun cluster source ou cible n'est supprimé.
Après vérification, archiver l'état Electric et le laisser reconstruire son
flux ; déplacer la référence seulement après validation du nouveau serveur.
Pas de retour automatique sur une ancienne base après reprise des écritures.

Un serveur externe ou une divergence non expliquée exige réconciliation ;
aucune initialisation ne remplace une migration. DIU ne porte que la livraison.
