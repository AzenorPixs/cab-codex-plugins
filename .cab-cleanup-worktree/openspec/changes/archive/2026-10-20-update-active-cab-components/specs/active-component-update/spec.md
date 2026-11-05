## ADDED Requirements

### Requirement: Paquet complet et vérifié
Le plugin MUST distribuer le broker Python complet synchronisé avec src/, les scripts CAB, unités et ressources Web. L'outil MUST vérifier version, fermeture des imports, syntaxe et empreintes du jeu avant toute mutation des services. Un downgrade ou un paquet incomplet MUST être refusé.

#### Scenario: Module broker absent
- **WHEN** le paquet ne contient pas le routeur Python attendu
- **THEN** la mise à jour échoue avant arrêt ou remplacement

### Requirement: Destinations fermées et privées
L'outil MUST remplacer seulement les artefacts CAB de destinations explicites, hors workspace et paquet source. Il MUST refuser liens, fichiers non ordinaires et propriété de service inconnue. Il MUST préserver configuration, secrets, sources et runtime métier. Le répertoire broker MUST correspondre au lancement natif prouvé par la procédure.

#### Scenario: Destination dans le projet
- **WHEN** une destination désigne le workspace piloté
- **THEN** l'outil refuse sans aucune écriture dans ce workspace

### Requirement: Maintenance durable et frontière sûre
La mise à jour de briques CAB actives MUST acquérir un gel corrélé SHARED_MAINTENANCE, attendre la cohorte native et les contextes quiescents, puis confirmer HELD avant arrêt. Elle MUST NOT décider, rejouer une permission ou purger le runtime. Une attente bornée MUST conserver le gel et les processus en place et permettre la reprise de la transaction.

#### Scenario: RUN encore occupé
- **WHEN** la cohorte reste occupée à l'échéance
- **THEN** la transaction reste en attente, aucun artefact actif n'est remplacé et aucun processus n'est arrêté

### Requirement: Déploiement des quatre briques et états conservés
L'outil MUST prendre en charge broker, contrôleur, superviseur et Web, actifs ou inactifs. Il MUST arrêter les briques initialement actives avant remplacement et rétablir leurs états initiaux. Le broker MUST utiliser uniquement les routes MCP natives connect/disconnect. OpenCode MUST rester ouvert et aucune activation au login MUST être ajoutée.

#### Scenario: Web actif et superviseur inactif
- **WHEN** leur version installée est antérieure au paquet
- **THEN** le Web est redémarré sur le nouveau jeu et le superviseur installé reste inactif

### Requirement: Vérification avant reprise
La réussite MUST exiger les versions propres aux processus relancés, leur workspace et les identités/générations des RUN conservées avant levée du gel. Les pauses préexistantes MUST rester inchangées. Une source inconnue MUST être déclarée indisponible, sans déduction depuis le plugin.

#### Scenario: Broker de mauvaise version après reconnexion
- **WHEN** la readiness indique une ancienne version du broker
- **THEN** la réussite est refusée et le repli est engagé

### Requirement: Journal et retour arrière récupérables
L'outil MUST conserver un journal atomique privé et les sauvegardes des seuls artefacts remplacés. Un verrou MUST interdire les déploiements concurrents. Une erreur après arrêt MUST déclencher le rétablissement des artefacts et états initiaux ; une interruption MUST être récupérable avant une nouvelle transaction. Le repli MUST NOT restaurer un ancien runtime métier.

#### Scenario: Démarrage de la nouvelle version échoué
- **WHEN** une brique refuse le nouveau jeu
- **THEN** les artefacts précédents et états initiaux sont rétablis ; un repli incomplet conserve le gel et signale la récupération nécessaire

### Requirement: Idempotence et bilan explicite
Un jeu déjà conforme MUST être conservé sans redémarrage inutile. Le bilan MUST distinguer paquet disponible, fichiers déployés, versions réellement actives, états inactifs, attente et repli. Une opération sur des schémas incompatibles MUST être refusée sans migration implicite.

#### Scenario: Deuxième invocation inchangée
- **WHEN** les empreintes et versions sont conformes
- **THEN** les briques actives restent en place et le bilan indique déjà à jour
