## ADDED Requirements

### Requirement: Sceau limité à une connexion native pertinente
L’attribution d’un client interactif SHALL vérifier ses identités, exécutable,
terminal et au moins une paire TCP réciproque possédée et présente aux deux
observations. Les sockets tiers SHALL NOT faire partie de ce sceau. Aucune
connexion pertinente stable ou une identité divergente SHALL maintenir le refus.

#### Scenario: Connexions API tierces apparaissant pendant une sonde
- **WHEN** une paire serveur/client attestée reste présente et des sockets tiers changent
- **THEN** ce bruit ne suffit pas à invalider la preuve ; les autres candidats et identités restent vérifiés
