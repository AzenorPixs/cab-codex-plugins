## ADDED Requirements

### Requirement: Remédiation d’une perte de connecteur MCP

CAB MUST surveiller les transitions actif vers inactif indépendamment de l’interface. CAB MUST vérifier l’identité de l’agent toujours actif avant d’agir et protéger les effets incertains. Le résultat horodaté MUST figurer dans les notifications. Le succès MUST exiger un heartbeat frais, un moteur et un catalogue concordants.

#### Scenario: L’agent reste actif

- **WHEN** CAB détecte la perte et confirme l’identité noyau de l’agent
- **THEN** CAB tente un contrôle natif ou une récupération bornée du moteur par son relais et publie le résultat sur preuve

#### Scenario: Effet protégé ou catalogue manquant

- **WHEN** la récupération est incertaine ou que le catalogue n’est pas observé
- **THEN** CAB conserve les protections et aucun succès n’est publié

### Requirement: Registre des binaires observés par CAB

CAB MUST stocker le PID, le compte, le chemin et l’état des binaires suivis. Un arrêt MUST conserver la ligne jusqu’au prochain démarrage normal. CAB MUST conserver les lignes pendant un démarrage corrélé à une mise à jour du paquet en cours.

#### Scenario: Démarrage normal et mise à jour

- **WHEN** CAB démarre sans reçu de mise à jour applicable à sa version
- **THEN** il vide le registre avant la première observation
- **AND THEN** il préserve les lignes si le démarrage correspond à une transaction de mise à jour vérifiée
