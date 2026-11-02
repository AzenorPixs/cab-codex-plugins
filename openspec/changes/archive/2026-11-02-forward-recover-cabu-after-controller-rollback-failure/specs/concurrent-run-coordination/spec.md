## ADDED Requirements

### Requirement: Compatibilité du reçu terminal de rejet pendant un rollback

Un rejet natif terminal MUST être stocké dans un schéma de décision et de registre déjà lisible par la brique immédiatement antérieure. Le digest du transcript MUST rester durable et corrélé à la demande. À la restauration, une extension connue plus récente MAY être normalisée sans modifier l’identité, le statut `rejected`, les ressources ou les autres RUN. Une extension inconnue ou une preuve divergente MUST échouer fermement.

#### Scenario: Normalisation d’une empreinte 2.1.67

- **GIVEN** un rejet `CANCELLED` avec empreintes connues `nativeProofDigest` et `nativeRejectionProofDigest`
- **WHEN** un contrôleur plus récent restaure le registre
- **THEN** il conserve un digest identique dans le champ compatible existant et retire seulement les extensions redondantes

#### Scenario: Rejet divergents ou état actif

- **GIVEN** des digests malformés ou divergents, un statut non rejeté ou une opération native active
- **WHEN** la normalisation est examinée
- **THEN** le registre conserve ses protections et refuse d’inférer un rejet
