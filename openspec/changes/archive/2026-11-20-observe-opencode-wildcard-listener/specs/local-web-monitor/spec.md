## ADDED Requirements

### Requirement: Découverte locale de l’écoute IPv4 d’OpenCode

CAB MUST prendre en compte les sockets serveur IPv4 appartenant à l’instance OpenCode vérifiée qui acceptent une connexion sur 127.0.0.1. La sonde MUST utiliser l’adresse locale et confirmer l’identité du processus répondant avant une action de remédiation.

#### Scenario: OpenCode écoute sur toutes les interfaces IPv4

- **WHEN** l’instance OpenCode vérifiée détient une écoute sur 0.0.0.0
- **THEN** la surveillance inclut ce port pour sa sonde sur 127.0.0.1 et vérifie le PID de la réponse native
- **AND THEN** l’état MCP connecté dans CAB reste fondé sur un heartbeat CAB authentifié
