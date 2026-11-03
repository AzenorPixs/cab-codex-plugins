## ADDED Requirements

### Requirement: Distinguer un refus non authentifié de l’indisponibilité d’une session
Le cadrage CAB SHALL orienter le pilote vers le client local authentifié
existant avant de conclure à une panne ou un SID inutilisable depuis un401
sans authentification. La valeur du credential SHALL rester hors du modèle.
Une absence réelle de capacité d’exécution SHALL être distinguée de l’absence
d’un connecteur nommé CAB. Cette clarification SHALL ne créer aucun effet.

#### Scenario: Même SID accessible avec le client distribué
- **GIVEN** un GET direct401 sans authentification
- **WHEN** les GET info et session réussissent avec le client local CAB
- **THEN** le pilote conserve le SID et le credential, sans demander sa valeur ni déclarer une panne
