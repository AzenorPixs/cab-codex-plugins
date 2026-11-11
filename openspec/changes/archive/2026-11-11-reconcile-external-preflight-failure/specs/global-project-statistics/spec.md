## ADDED Requirements

### Requirement: Continuité quantitative native après handoff

SGS MUST collecter les mesures OpenCode depuis la source native liée au RUN et
conserver leur provenance, les zéros observés et la couverture indisponible.
Un handoff du contrôleur MUST NOT créer une nouvelle identité de collecte ni
compter une seconde fois les messages déjà collectés.

#### Scenario: Contrôleur remplacé sans changement de session native
- **WHEN** un contrôleur compatible reprend un RUN lié à la même instance et session OpenCode
- **THEN** SGS conserve le binding et les mesures natives, puis déduplique toute relecture des mêmes messages

#### Scenario: Mesure non exposée ou nulle
- **WHEN** une source native ne fournit pas une mesure ou fournit explicitement zéro
- **THEN** SGS distingue la couverture indisponible du zéro observé, sans valeur inventée
