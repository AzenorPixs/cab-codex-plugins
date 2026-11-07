## ADDED Requirements

### Requirement: Atelier prioritaire pour les tests
Le codeur SHALL utiliser l’atelier en priorité pour tout test. Avant LXC/Docker, il SHALL justifier auprès de l’orchestrateur le critère explicite non réalisable dans l’atelier. L’orchestrateur SHALL examiner cette justification et décider. Les allocations supplémentaires et validations métier existantes SHALL rester inchangées.

#### Scenario: Recette exigeant un privilège absent de l’atelier
- **WHEN** le codeur présente le critère et la preuve de capacité manquante
- **THEN** l’orchestrateur accepte ou refuse le recours à une ressource LXC/Docker déjà allouée et trace sa décision
