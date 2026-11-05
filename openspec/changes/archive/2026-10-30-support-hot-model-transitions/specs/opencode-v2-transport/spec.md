## ADDED Requirements

### Requirement: Raccord fournisseur natif confidentiel
Le client MUST utiliser POST /api/integration/{integrationID}/connect/key selon le contrat V2 qualifié, avec secret fourni uniquement au processus par un canal privé. Il MUST vérifier l’identité serveur et la frontière partagée avant effet, puis la connexion opaque sans lire GET /api/credential ni stockage privé. Il MUST NOT exposer le secret, utiliser V1 ou imposer un redémarrage OpenCode. Une réponse incertaine MUST rester signalée comme effet possible sans rejeu.

#### Scenario: Compte connecté à chaud
- **WHEN** une nouvelle clé est fournie par un gestionnaire sous frontière coordonnée
- **THEN** le raccord vérifie le changement de connexion native et la prise en compte à la génération suivante sans fermeture du processus

#### Scenario: Pair actif ou réponse incertaine
- **WHEN** une activité empêche la frontière ou que le POST peut avoir été appliqué sans confirmation
- **THEN** le raccord refuse avant effet dans le premier cas et conserve l’incertitude après effet dans le second, sans secret ni seconde injection automatique
