## MODIFIED Requirements

### Requirement: Identité publique du workspace observé
GET /api/snapshot MUST exposer identity.workspace avec le workspace absolu
configuré, canonique au lancement CLI. Cette identité MUST rester disponible
sans contrôleur ni superviseur. Elle MUST NOT exposer de variable secrète et
sa lecture MUST rester sans effet métier.

#### Scenario: Vérification avant réutilisation
- **WHEN** `/CAB start` interroge une instance déjà active
- **THEN** il peut comparer son workspace et sa version attendus sans lire de
  fichier runtime privé
