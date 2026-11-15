# PostgreSQL 17 et 18

CAB prend officiellement en charge PostgreSQL17 sous Debian Trixie et18 sous
Forky. Les dépendances Debian sont `postgresql` et `postgresql-common` ; la
cible est tirée de la dépendance réelle du métapaquet, pas d'un chemin17 figé.
Un ancien paquet à dépendance fixe peut être adopté avec l'outil de versions
de postgresql-common encore présent sous Trixie.

Dans `/etc/cab/cab.json`, `postgresql` conserve `major` (17 ou18), `cluster`
(`cab`) et `port` (port configuré). Les secrets existants ne changent pas.
L'initialisation reste exclusivement le premier parcours Web authentifié.
Une base existante est qualifiée puis référencée sans réinitialisation.

Au démarrage et à l'installation, CAB compare référence, serveur SQL et cible
Debian installée avant Django/Electric. Pas de rétrogradation automatique.
Une divergence de référence, une cible absente ou déjà occupée, une base
externe ou un cluster partagé bloque la migration avec diagnostic journald.
Les versions autres que17/18 exigent une qualification et une évolution CAB.

Une montée de version exige l'arrêt des clients du cluster CAB et l'absence
d'opération non terminale ou bail détenu. Les RUN de codage restent enregistrés
avec leur SID et leurs protections ; aucun travail n'est rejoué. La livraison
CABU conserve sa frontière de maintenance normale.

Le parcours utilise `pg_upgradecluster --method=dump`, conserve l'ancien
cluster et reconstruit les index. Un dump complet, les configurations et les
empreintes de toutes les tables, séquences, rôles CAB et publications sont
conservés sous `/var/lib/cab/postgresql-migrations`. Ces sauvegardes sont privées
et contiennent des secrets ; ne pas les joindre aux diagnostics publics.
Le reçu courant est `/var/lib/cab/postgresql-migration.json`. Une frontière HBA
temporaire réserve la migration à postgres local, puis la configuration HBA
d'origine est restaurée. La référence n'est adoptée qu'après intégrité vérifiée.

Electric conserve son ancien stockage dans la sauvegarde et reconstruit son
flux et ses shapes depuis la nouvelle base. Ses lectures restent autorisées
par Django. Une indisponibilité Electric n'est pas une réussite CABU.

Après une interruption entre préparation et validation, CAB exige une
réconciliation du reçu, des deux clusters et de leurs ports ; il ne réémet pas
la migration. L'ancien cluster reste arrêté, démarrable explicitement sur son
port de repli. Ne jamais restaurer automatiquement une ancienne base après
reprise des écritures sur la nouvelle. La restauration du dump complet exige
une intervention administrative hors ligne, avec inventaire et cible vide.
La durée de coupure dépend du volume du cluster ; aucun délai fixe n'est promis.

Qualification minimale reproductible : construire `tests/postgresql-migration.Dockerfile`
dans un conteneur jetable, puis lancer `tests/postgresql_migration.py` avec
`CAB_PG_MIGRATION_FIXTURE=1`. Le test prépare un vrai PG17 et migre vers le vrai
PG18 du métapaquet Forky, vérifie les données, les refus et le flux Electric.
Il ne teste pas une mise à niveau complète du système Debian de l'hôte.
