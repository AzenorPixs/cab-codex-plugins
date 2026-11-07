## ADDED Requirements

### Requirement: Marqueur statistique de l’effacement courant
La projection SGS SHALL retirer le seul champ racine erasure_prepared de broker-statistics lorsqu’il correspond exactement au reçu d’effacement courant. Cette règle SHALL aussi couvrir les checkpoints en attente dans l’outbox. Toute autre donnée et tout marqueur étranger SHALL rester soumis aux gardes ordinaires.

#### Scenario: Marqueur du même reçu
- **WHEN** le checkpoint broker référence la transaction courante
- **THEN** seul le marqueur est retiré et la projection peut se poursuivre

#### Scenario: Marqueur étranger
- **WHEN** le marqueur désigne une autre transaction
- **THEN** il n’est pas supprimé par cette exception et les références non classées restent refusées
