## Architecture

Un broker stdio et un serveur OpenCode sont partagés dans un même contexte
de répertoire. Un contrôleur héberge plusieurs contextes de job isolés et un
registre unique. Le superviseur suit les contextes sans décision métier.
Le registre technique ne remplace jamais les spécifications du projet.

## Réservations

`GET /runs` expose les réservations. `POST /runs/reserve` prend runId,
ownerId, sessionId, directory, changeId, selectionKey, resources et dependsOn.
Une ressource possède key et mode read ou write. Les chemins file: sont
relatifs, canoniques et sans traversal ; un répertoire couvre ses descendants.
Les autres clés décrivent capacités, contrats ou ressources externes. Deux
lectures sont compatibles ; une écriture concurrente sur la même ressource
ou une ressource englobante est refusée. Un effet inconnu réserve project:*.
Les dependsOn désignent des changes livrés dans le registre ; les prérequis
historiques hors registre sont examinés par Codex avant sélection.

Le registre publie une version de réservation monotone. Les mutations sont
sérialisées, écrites dans un candidat synchronisé puis remplacées atomiquement
avant réponse. Un verrou de processus interdit deux autorités sur ce registre.
Ni expiration ni silence ne libère la réservation. Une erreur de persistance
gèle l'autorité ; le redémarrage exige un document valide et réconciliation.

## Routage

`/runs/<runId>/job/...`, `/runs/<runId>/status` et
`/runs/<runId>/decision/<requestId>` ciblent un contexte. Les notifications
broker sont routées par run_id et contrôlées contre session, racine, change
et reservation_version. Les requestId restent uniques dans le contrôleur.
Sans cible, les anciennes interfaces restent disponibles pour un seul
contexte ; plusieurs contextes rendent les mutations historiques ambiguës.

Chaque mandat fichier exige une ressource file: en écriture. Une commande
exige un manifeste de ressources explicite inclus dans la réservation ; CAB
ne devine pas ses effets en analysant le texte shell. Un défaut de couverture
ou une génération ancienne refuse la permission. Les approbations ne sont
jamais partagées entre RUN. Les métadonnées natives de session et permission
sont vérifiées par le contrôleur avant transmission de once.

## Cycle de vie

Une réservation couvre sélection/préparation, implémentation, validation,
intégration et rapport d'archive. Un transfert contrôlé de session conserve
son propriétaire RUN. L'extension de périmètre utilise la version attendue
et refuse les conflits avant tout mandat. L'intégration utilise une exclusion
commune distincte des travaux indépendants. La clôture locale ne prouve
jamais la complétude globale. Une libération exige le job désarmé, les
permissions et effets réconciliés et l'absence de mandat non résolu.

Les appels readiness possèdent une vue globale et une vue par RUN. Une
demande métier en attente dans A ne bloque pas B ; une panne commune de
magasin, journal ou transport suspend tous les contextes concernés.

## Migration et repli

Les fichiers historiques restent lisibles en mode unique. Le registre des
RUN est un nouvel état versionné ; il n'est ni reconstruit par effacement
ni purgé au démarrage d'un second RUN. Le repli vers 0.87.2 exige l'arrêt
contrôlé de tous les RUN concurrents et la conservation de leurs preuves.
La mise à jour du paquet ne redémarre aucun composant actif.

## Validation

Tests de sélection simultanée, trois RUN indépendants, conflits de ressources
et dépendances, ancien propriétaire, crash/restauration, permission exacte,
gates individuels, récupération et purge. Régression complète des contrats
historiques, syntaxe, versions, cohérence des prompts, UTF-8/LF et OpenSpec.
L'intégration utilise des serveurs HTTP et un broker subprocess temporaires ;
aucun accès au serveur OpenCode utilisateur n'est nécessaire.

## Barrière de publication dans le répertoire partagé

Chaque RUN déclare un jalon stable par /ready après contrôles locaux et
réconciliation native. /integration suspend les nouvelles permissions des
autres RUN et vérifie toute la cohorte. Le propriétaire peut déclarer project:*
en lecture pour les validations combinées. La libération précise published et
les preuves ; elle fait évoluer referenceVersion. Les autres RUN réexaminent
la base et leurs validations puis utilisent /reconcile avec preuves pour
obtenir une génération fraîche. Le contexte technique reste identifié par
contextId pendant extensions et récupérations. Après livraison, le même RUN
peut sélectionner le suivant avec une nouvelle session et un nouveau contexte.
Un échec de quiescence avant admission de l'intégration annule l'acquisition
sans modifier la référence. Une libération après admission invalide les bases
observées, même en cas d'abandon sans publication, par prudence.

Le healthcheck est diagnostic : aucun redémarrage automatique ne peut être
autorisé par un simple snapshot. Les unités systemd conservent leur
Restart=on-failure pour les arrêts techniques des processus eux-mêmes.
