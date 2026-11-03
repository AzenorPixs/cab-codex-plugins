## ADDED Requirements

### Requirement: Retrait autonome documenté d’une unité approuvée avec accès détenu
Le contrat distribué MUST diriger le propriétaire vers locks/release avec
RECONCILED pour une unité obsolète PREPARED/APPROVED et accès HELD avant
émission native. Il MUST distinguer ce cas du retrait sans accès et interdire
le faux NO_EFFECT, le changement de décision historique et le rejeu de once.
Les gardes existantes et les limites du mandat MUST rester opposables.

#### Scenario: Demande d’aide pour une voie déjà disponible
- **GIVEN** une unité approuvée jamais émise dont l’accès est HELD et la frontière native prouvée quiescente
- **WHEN** l’orchestrateur doit retirer cette unité dans son mandat
- **THEN** le skill et la commande le dirigent vers la procédure existante sans solliciter le correcteur ni le développeur

#### Scenario: Signalement PENDING périmé
- **WHEN** un ancien retour PENDING est suivi d’une décision APPROVED durable
- **THEN** l’orchestrateur relit admission et décision sur les mêmes identifiants et ne diagnostique pas une panne à partir de l’ancien retour

#### Scenario: Effet incertain ou résultat de retrait absent
- **WHEN** la frontière ou la réussite du retrait n’est pas prouvée
- **THEN** les protections restent conservées et aucune autorisation, réussite métier ou absence d’effet n’est inventée
