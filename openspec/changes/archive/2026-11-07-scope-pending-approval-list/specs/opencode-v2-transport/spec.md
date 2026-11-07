## ADDED Requirements

### Requirement: Liste des validations délimitée et paginée
Le broker SHALL accepter les filtres exacts run_id et session_id et paginer les résultats après filtrage. Il SHALL préserver le comportement sans filtre et les contrôles d’expiration existants. Un filtre invalide SHALL être refusé. Aucun contenu d’un autre RUN ou SID SHALL être inclus dans une réponse filtrée.

#### Scenario: Validations de plusieurs RUN
- **WHEN** une liste est demandée avec un RUN et un SID
- **THEN** seules leurs validations sont retournées et le nombre reflète ce périmètre

#### Scenario: Résultats au-delà de la première page
- **WHEN** le nombre de validations filtrées dépasse la limite
- **THEN** les pages suivantes permettent de retrouver les autres validations sans divulguer de pair
