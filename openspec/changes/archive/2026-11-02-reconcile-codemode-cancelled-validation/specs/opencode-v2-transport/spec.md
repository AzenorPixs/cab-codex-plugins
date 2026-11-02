## ADDED Requirements

### Requirement: Annulation exacte d’une validation imbriquée sous Code Mode

Le contrôleur MUST pouvoir corréler une demande native `request_validation`
unique imbriquée dans `execute` avec une annulation terminale `CANCELLED` par
OpenCode. Pour un wrapper d’annulation, les métadonnées MUST montrer une
découverte littérale `cancel_approval` puis l’appel unique à l’approvalId exact,
et la sortie MUST confirmer toutes les identités. Le double transcript, la
session idle et l’absence de permission ou d’accès restent requis. Aucune
décision ni `once` n’est créé.

#### Scenario: Wrapper Code Mode d’annulation terminale

- **WHEN** un wrapper complet et non tronqué lie une demande exacte à la découverte et l’appel unique `cancel_approval` puis retourne CANCELLED/OC concordant
- **THEN** CAB clôt la même opération sans décision, permission ou accès

#### Scenario: Wrapper ambigu ou effet possible

- **WHEN** le wrapper est tronqué, ses métadonnées ajoutent un appel ou son identité, transcript, session, permission ou opération diverge
- **THEN** CAB conserve l’opération protégée et n’émet aucune décision
