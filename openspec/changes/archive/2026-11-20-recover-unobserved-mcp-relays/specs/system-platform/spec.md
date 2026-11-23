## ADDED Requirements

### Requirement: Génération de paquet dans la définition MCP
CAB MUST conserver CAB_MCP_PACKAGE_VERSION dans l’environnement de sa déclaration MCP gérée. La valeur MUST être stable à version inchangée et suivre la version du paquet. Les autres données et secrets MUST rester préservés. Le marqueur MUST NOT valoir preuve de reconnexion ; une session d’origine MUST fournir une nouvelle négociation et un catalogue réellement observés avant READY.

#### Scenario: Nouvelle version
- **WHEN** CAB active une nouvelle version du paquet
- **THEN** sa définition MCP porte la nouvelle génération et le client peut renouveler la connexion à sa frontière native sûre

#### Scenario: Réconciliation idempotente
- **WHEN** la même version est réconciliée à nouveau
- **THEN** la définition effective reste identique, sans nonce aléatoire ni boucle de reconnexion

#### Scenario: Donnée étrangère ou format ambigu
- **WHEN** la déclaration appartient à une autre commande ou son format ne peut être modifié sans ambiguïté
- **THEN** CAB refuse l’écriture et préserve toutes les données antérieures

#### Scenario: Rafraîchissement non observé
- **WHEN** le marqueur est écrit mais aucun nouveau moteur/catalogue n’est observé
- **THEN** CAB conserve l’attente de reconnexion sans fabriquer de version ni de succès

### Requirement: Reprise graphique autonome après mise à jour CABU
CABU MUST essayer le parcours natif en priorité. Quand un relais de l’instance graphique authentifiée qui a demandé la mise à jour reste en RELOAD_REQUIRED, le superviseur MAY arrêter cette instance, son moteur et les relais identifiés sous le même compte après vérification du mandat et des protections actives. CAB MUST confier la relance au gestionnaire de services du compte d’origine.

#### Scenario: Arrêt d’un processus ciblé
- **WHEN** la mise à jour est vérifiée et le redémarrage de l’instance identifiée est admis
- **THEN** CAB écrit son reçu avant l’effet, envoie SIGTERM via PIDFD, puis SIGKILL sur le même PIDFD uniquement si la sortie n’est pas observée avant le délai

#### Scenario: Résultat d’arrêt ou de reprise incertain
- **WHEN** la sortie ou la relance reste incertaine
- **THEN** CAB conserve le reçu et ne rejoue pas l’effet

#### Scenario: Nouveau frontend actif
- **WHEN** l’ancienne instance a quitté et le compte d’origine a relancé le frontend
- **THEN** CAB attend les heartbeats de relais rattachés au nouveau frontend attestant le moteur et le catalogue de la version cible
