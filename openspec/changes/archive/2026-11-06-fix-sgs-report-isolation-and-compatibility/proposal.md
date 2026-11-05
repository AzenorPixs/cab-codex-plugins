# Isoler les rapports SGS et préserver les archives

Code non attribué ; attribution ultérieure par ACL.

## Why

La récupération globale peut empêcher le rapport individuel. Les mandats REPORT,
les rapports anciens et la définition des agents ne sont pas tous alignés avec
le moteur distribué. Les quatre corrections sont incluses dans le mandat SCM.

## What Changes

- Isoler CHANGE de toute récupération du global et séparer le delta facultatif.
- Transmettre les preuves par entrée standard et réserver le seul candidat dérivé du rapport.
- Amender le rapport ancien identifié sans déplacer son contenu ni imposer six sections historiques.
- Garder les identités d’agents libres et les périmètres de mesures explicitement validés.

## Capabilities

### Modified Capabilities
- global-project-statistics: contrat de production et maintenance des rapports.

## Impact

Moteur, coordination REPORT, skills, documentation et tests CAB ; version2.3.2.
Les archives antérieures et les travaux préexistants sont conservés.
