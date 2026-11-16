## ADDED Requirements

### Requirement: Attente du catalogue MCP sans rechargement répété
Lorsqu’un relais dispose déjà d’un moteur vivant à la version cible mais attend encore la lecture du catalogue par le client, CAB MUST conserver cet état d’attente sans redémarrer le moteur en boucle. La reconnexion et la mise à jour MUST rester en attente jusqu’à observation du catalogue réel ou d’un état terminal admissible.

#### Scenario: Catalogue encore non lu
- **WHEN** le moteur est chargé à la version cible et que le catalogue du client n’est pas encore observé
- **THEN** CAB attend le catalogue sans rejouer le rechargement ni déclarer le connecteur prêt.
