## ADDED Requirements

### Requirement: Bootstrap résolu depuis la version installée

Le bootstrap MUST déduire la version CAB attendue du manifeste du plugin vérifié installé, sans suffixe de cache. Il MUST comparer cette version à l’identité native du moniteur et MUST NOT exiger une ancienne version fixe. CABU MUST comparer aussi la révision complète des plugins et utiliser le gestionnaire officiel pour une nouvelle révision compatible.

#### Scenario: Nouveau paquet et moniteur conforme

- **WHEN** le paquet installé et le moniteur annoncent la même version de base
- **THEN** le bootstrap réutilise l’instance conforme sans redémarrage motivé par une ancienne valeur documentaire
