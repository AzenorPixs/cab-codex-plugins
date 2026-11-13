## ADDED Requirements

### Requirement: Relais MCP rechargeable sans rejeu
CAB MUST fournir un relais stdio stable pour Codex/OpenCode, indépendant du
moteur remplaçable. Il MUST conserver les requêtes métier et serveur en vol,
attendre une frontière sûre et MUST NOT rejouer un appel après redémarrage.
Seul le handshake protocolaire MAY être réinitialisé.

#### Scenario: Requête métier active pendant installation
- **WHEN** la version change alors qu'une requête est encore en vol
- **THEN** CAB diffère le remplacement, conserve le canal et transmet le reçu unique

#### Scenario: Frontière sûre
- **WHEN** aucun appel métier ni demande serveur ne reste indécis
- **THEN** le relais recharge le moteur et notifie le changement de catalogue

### Requirement: Preuve de moteur et de catalogue
CAB MUST enregistrer identité de processus, UID/profil, génération et version
chargée. Une lecture tools/list achevée MUST prouver la version de catalogue.
Une notification seule MUST NOT valoir acquittement de rechargement client.

#### Scenario: Catalogue non relu
- **WHEN** le moteur est rechargé mais le client n'a pas relu son catalogue
- **THEN** le reçu expose l'attente, sans prétendre que les outils sont actualisés

### Requirement: CABU et attente durable de son initiateur
Le relais MUST pouvoir maintenir l'attente du même job CABU pendant son propre
rechargement, par lectures seulement après admission unique. Le reçu MUST
séparer installation vérifiée et reconnexion effective des connecteurs actifs.

#### Scenario: CABU invoqué par le connecteur à remplacer
- **WHEN** la nouvelle version est prête alors que cab_update attend son reçu
- **THEN** le relais recharge son moteur sans réadmettre le job ni perdre sa réponse

### Requirement: Compatibilité et protections des anciens connecteurs
CAB MUST détecter les anciens connecteurs connus par métadonnées bornées et
signaler RELOAD_REQUIRED si aucune reprise native sûre n'est disponible.
Il MUST NOT tuer un client ou injecter des requêtes dans son canal privé.
SID/RUN, générations de codage, secrets et reçus MUST rester conservés.

#### Scenario: Ancien connecteur sans interface de rechargement
- **WHEN** un processus déjà chargé n'a ni relais ni interface native accessible
- **THEN** CAB conserve sa session et indique la reprise native requise sans faux succès

### Requirement: Actualisation native du catalogue Codex
L'intégration CAB MAY activer mcp_tool_list_changed via la CLI native si elle
est disponible et sans choix explicite existant. Elle MUST préserver une
désactivation explicite, les autres configurations et les secrets. Une capacité
absente MUST rester diagnostiquée, sans déclaration de catalogue rechargé.

#### Scenario: Option disponible sans choix utilisateur
- **WHEN** la CLI native annonce cette option et aucun override n'existe
- **THEN** CAB l'active par cette CLI et vérifie sa valeur

#### Scenario: Désactivation explicite
- **WHEN** le profil déclare false
- **THEN** CAB conserve cette décision et expose la limite de reconnexion
