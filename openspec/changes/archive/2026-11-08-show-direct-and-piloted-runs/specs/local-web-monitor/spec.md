## ADDED Requirements

### Requirement: Coexistence des RUN directs et pilotés

Le moniteur MUST afficher simultanément les sessions SGS CAB directes du projet et les RUN pilotés du contrôleur. Il MUST conserver leur mode et leurs identités sans fusionner des sessions différentes, même en cas de collision d'identifiant. Une source SGS indisponible MUST être signalée et MUST NOT masquer les RUN pilotés. Le mode direct MUST rester indépendant d'OpenCode.

#### Scenario: Session directe et RUN piloté actifs
- **WHEN** SGS contient une session CAB directe du projet et que le contrôleur expose un RUN piloté
- **THEN** les deux apparaissent avec leur mode et leur identité propres

#### Scenario: SGS indisponible
- **WHEN** SGS est indisponible pendant la collecte
- **THEN** les RUN pilotés restent visibles et la source SGS est signalée indisponible
