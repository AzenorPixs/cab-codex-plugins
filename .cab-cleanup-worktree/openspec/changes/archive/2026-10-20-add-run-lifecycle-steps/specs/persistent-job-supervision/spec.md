## ADDED Requirements

### Requirement: Restauration compatible du cycle
Les anciens jobs sans lifecycle MUST rester lisibles avec étape inconnue. Un lifecycle présent mais invalide MUST refuser la restauration sans réparation. Un réarmement du même job et une récupération dans le même RUN MUST conserver son historique ; un nouveau job MUST démarrer sans déclaration d'étape.

#### Scenario: Redémarrage après retour en implémentation
- **WHEN** le contrôleur redémarre après un passage REVIEW puis IMPLEMENTATION persisté
- **THEN** il restaure Implémentation 6/11 et les deux passages dans leur ordre
