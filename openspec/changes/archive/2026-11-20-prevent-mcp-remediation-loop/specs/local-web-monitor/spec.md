## MODIFIED Requirements

### Requirement: Remédiation d’une perte de connecteur MCP

CAB MUST surveiller les transitions actif vers inactif indépendamment de l’interface. CAB MUST vérifier l’identité de l’agent toujours actif avant d’agir et protéger les effets incertains. Le résultat horodaté d’une remédiation MUST figurer dans les notifications. Le succès MUST exiger un heartbeat frais, un moteur et un catalogue concordants.

#### Scenario: L’agent reste actif

- **WHEN** CAB détecte une perte persistante et confirme l’identité noyau de l’agent
- **THEN** CAB tente un contrôle natif ou une récupération bornée du moteur par son relais et publie le résultat sur preuve

#### Scenario: Une liaison saine prend déjà le relais

- **WHEN** CAB observe un seul remplaçant vivant pour le même acteur, la même instance et le même emplacement, avec un heartbeat frais, un relais, un moteur et un catalogue à la version déployée
- **THEN** CAB n’émet aucun nouveau contrôle pour l’ancienne liaison et clôt son observation comme devenue sans objet sans notification de remédiation
- **AND THEN** CAB préserve les résultats et protections des contrôles déjà engagés

#### Scenario: Effet protégé ou catalogue manquant

- **WHEN** la récupération est incertaine ou que le catalogue n’est pas observé
- **THEN** CAB conserve les protections et aucun succès n’est publié
