## ADDED Requirements

### Requirement: Confirmation de suppression sans preuve de clôture
CAB MUST proposer une troisième confirmation décochée par défaut si seule
la preuve de clôture manque pour une session de codage directe ou pilotée.
Cette confirmation MUST lever le seul contrôle de clôture. CAB MUST vérifier
de nouveau l’aperçu sous verrou et inscrire la dérogation dans le reçu.

#### Scenario: Suppression sans preuve de clôture
- **WHEN** seule la preuve de clôture manque et que l’utilisateur confirme la suppression sans preuve, l’irréversibilité et les éventuels liens partagés sur un aperçu courant
- **THEN** CAB supprime les données propres du RUN et indique dans le reçu que la preuve de clôture a été écartée

#### Scenario: Protection en cours de suppression
- **WHEN** un effet, bail, reçu, incident ou lien partagé protège le RUN, ou que l’aperçu a changé
- **THEN** CAB refuse la suppression, y compris avec la confirmation sans preuve de clôture

### Requirement: Suppression des itérations propres à une session
CAB MUST supprimer les cycles, passages d’étape et mesures de tokens propres
au RUN dans la même transaction et recalculer les agrégats des passages
conservés. La source d’import utilisée pour dédupliquer les importations
MUST être conservée.

#### Scenario: Nettoyage des données propres
- **WHEN** CAB supprime un RUN dont les passages et cycles lui sont propres
- **THEN** ses passages, cycles et mesures de tokens disparaissent, et les agrégats ne comptent plus que les passages conservés

#### Scenario: Mesure ou passage encore référencé
- **WHEN** un passage ou une mesure d’un autre RUN référence un passage ou un cycle de la session à supprimer
- **THEN** CAB refuse la suppression et restitue le motif à l’utilisateur
