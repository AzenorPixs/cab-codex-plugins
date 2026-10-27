## ADDED Requirements

### Requirement: Contrôle documentaire croisé des règles PLLM

Le contrôle documentaire MUST comparer les exigences courantes de persistent-job-supervision, codex-integration-distribution et archive-session-statistics aux supports CAB. Il MUST refuser toute prescription de réessai périodique sans PLLM admissible, toute restauration d'une échéance automatique et tout renvoi aux tentatives illimitées. Les archives historiques MUST rester hors de ce contrôle courant.

#### Scenario: Ancienne règle résiduelle dans une référence

- **WHEN** une référence courante prescrit encore un réessai PLLM périodique, une échéance automatique ou des tentatives illimitées
- **THEN** le contrôle documentaire échoue même si les supports distribués sont cohérents entre eux

#### Scenario: Références courantes réconciliées

- **WHEN** les références et supports conservent le choix, l'attente humaine, les échéances historiques sans effet et l'indépendance des sondes
- **THEN** le contrôle documentaire réussit sans modifier ni contrôler les archives comme exigences courantes
