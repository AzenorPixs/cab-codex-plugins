## ADDED Requirements

### Requirement: Prévol des branches protégées pour la synchronisation GitLab

CAB MUST distinguer un envoi interdit sur GitLab d’un remplacement non fast-forward interdit par les règles applicables lorsque les observations sont suffisantes. Le prévol MUST être revérifié à la confirmation. Tout envoi admissible MUST conserver la transaction atomique et les leases explicites.

#### Scenario: Historique local divergent et remplacement interdit

- **WHEN** la branche GitLab observée correspond à celle de l’aperçu, Git local ne prolonge pas sa tête et aucune règle de protection applicable n’autorise le force push
- **THEN** CAB indique le refus avant tout envoi et conserve la règle de protection.

#### Scenario: Envoi admissible

- **WHEN** GitLab autorise le mouvement proposé, notamment un fast-forward avec droit d’envoi
- **THEN** CAB conserve la synchronisation confirmée de la branche et des tags.

#### Scenario: Règle non attestable

- **WHEN** CAB ne peut pas attester la règle ou l’ascendance
- **THEN** GitLab reste l’autorité au moment de l’envoi et CAB conserve le diagnostic de retour existant.
