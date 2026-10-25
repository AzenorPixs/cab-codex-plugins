## ADDED Requirements

### Requirement: Transition du broker chargé 1.9.0 vers 1.10.0
La politique ordinaire reuse-readonly de CAB 1.10.0 MUST accepter une preuve exacte de broker chargé 1.9.0, avec les artefacts externes 1.10.0 inchangés. Elle MUST conserver les contrôles de propriétaire, groupe, manifeste, processus, PAUSE et maintenance. Les versions inconnues MUST rester refusées ; la version chargée MUST NOT être remplacée par la version sur disque dans la preuve.

#### Scenario: Broker 1.9.0 et artefacts 1.10.0
- **WHEN** les quatre services chargent 1.9.0 et les trois artefacts broker externes correspondent à 1.10.0 sous leur UID réel
- **THEN** la maintenance qualifiée conserve OpenCode, les artefacts et les PAUSE, puis prouve quatre briques 1.10.0 avant libération du gel

#### Scenario: Version chargée inconnue
- **WHEN** la preuve annonce une version hors de la liste qualifiée
- **THEN** le validateur refuse avant mutation sans contourner une garde de propriété ou de processus

#### Scenario: Déconnexion appliquée et réponse perdue
- **WHEN** une déconnexion sous HELD est appliquée mais son résultat devient ambigu
- **THEN** la reprise utilise le même journal, conserve le gel jusqu'à réconciliation et ne restaure ni ancien processus ni état métier
