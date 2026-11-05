# Spec Delta

## ADDED Requirements

### Requirement: Supervision durable des jobs non terminaux

CAB SHALL superviser durablement un job armé indépendamment du cycle de vie
d'un tour conversationnel. Il SHALL distinguer une panne ou indisponibilité
technique d'un état métier terminal, réconcilier les états observables après
une reconnexion SSE et ne relancer la session que selon le contrat de job. Une
relance SHALL rester une action technique sans effet sur une approbation ou une
décision CAB.

#### Scenario: Fermeture SSE pendant un job armé

- **WHEN** le flux SSE se ferme alors qu'un job armé conserve un gate ouvert
- **THEN** CAB réconcilie l'état par HTTP, conserve le job non terminal et ne
  le déclare ni terminé ni bloqué sans gate valide
