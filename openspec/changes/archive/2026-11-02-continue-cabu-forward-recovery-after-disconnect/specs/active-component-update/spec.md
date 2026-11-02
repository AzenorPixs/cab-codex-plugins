## ADDED Requirements

### Requirement: Vérifier la déconnexion parent d’une reprise liée

L’updater MAY reprendre un reçu enfant `ROLLBACK_FAILED` avec `brokerWasConnected=false` seulement si `recoveryOf` désigne un parent `SUPERSEDED` dont l’identité OpenCode et la déconnexion `CONFIRMED` concordent. MCP MUST être `disabled` ou `connected`. Un état incertain ou un parent absent MUST être refusé avant coupure.

#### Scenario: Enfant lié et broker déjà déconnecté

- **GIVEN** un reçu enfant `ROLLBACK_FAILED`, son parent superseded prouvant la déconnexion, une identité OpenCode stable et MCP `disabled`
- **WHEN** la reprise avant exacte est demandée depuis un paquet publié cohérent
- **THEN** l’updater préserve les reçus, prépare une transaction liée et reconnecte le broker après le démarrage contrôleur vérifié

#### Scenario: Parent, MCP ou broker divergent

- **GIVEN** un parent absent ou altéré, ou MCP `pending`/`failed`/`needs_auth`
- **WHEN** la reprise avant est demandée
- **THEN** elle est refusée avant arrêt ou mutation du RUN

### Requirement: Préserver les brokers source déjà avancés

Sous `cab-source`, l’updater MAY accepter un fichier broker local plus récent que les empreintes du reçu seulement s’il est identique au fichier de même nom dans le paquet GitHub courant. Le nouveau reçu MUST recontrôler ces empreintes. Toute différence est refusée avant remplacement.

#### Scenario: Broker local identique au paquet courant

- **GIVEN** les trois fichiers broker locaux sont identiques au paquet publié courant
- **WHEN** une reprise en avant s’effectue avec `cab-source`
- **THEN** l’updater les conserve et les inclut dans le contrôle du jeu complet

#### Scenario: Broker local divergent

- **GIVEN** un seul fichier broker local diffère du paquet publié courant
- **WHEN** une reprise en avant s’effectue avec `cab-source`
- **THEN** l’updater refuse avant la coupure et conserve le reçu
