## Why

Le diagnostic CGP-20261010 a identifié trois risques : clôture pendant une
validation manuelle indécise, interprétations incompatibles de l'URL du
contrôleur et activité SSE étrangère retardant la reprise du job surveillé.
Le développeur a validé leur reproduction et correction en SCM directe,
avec coexistence de ce seul correctif avec les trois changes historiques.

## What Changes

- Vérifier les validations locales indécises avant le gate terminal.
- Accepter une base HTTP ou son endpoint `/status` pour l'URL commune du
  contrôleur dans le superviseur et le healthcheck, avec les alias existants.
- Corréler l'activité SSE à la session du job ; ignorer les événements
  étrangers, de transport ou non corrélables pour son horloge d'activité.
- Ajouter des reproductions isolées et actualiser les documents concernés.
- Archiver ce seul change après validation et produire son STATISTIQUES.md.

## Capabilities

### New Capabilities

- Aucune.

### Modified Capabilities

- `controller-transport`: gate protégé contre les demandes locales indécises
  et interprétation compatible de l'URL de ses clients locaux.
- `persistent-job-supervision`: activité corrélée au job et à sa session.

## Impact

Contrôleur, superviseur, healthcheck, tests Node, TECHNICAL.md, README.md et
CHANGELOG.md. Aucune nouvelle dépendance, variable, publication, installation
de profil, intervention sur un service réel ni opération Git. La version
source reste 0.87.1 ; ce correctif est décrit sous Unreleased. Les trois
changes historiques et les corrections CGP sont conservés.
