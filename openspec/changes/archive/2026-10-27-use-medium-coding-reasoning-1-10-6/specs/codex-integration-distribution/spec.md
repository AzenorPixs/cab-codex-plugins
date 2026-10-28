## ADDED Requirements

### Requirement: Distribution source CAB 1.10.6
La préparation source MUST aligner le jeu CAB distribué sur la version 1.10.6
dans les métadonnées, modules, broker, scripts, services, commande, skill et
supports décrivant le profil courant. Elle MUST NOT modifier les installations,
services, caches ou RUN actifs. Les références qualifiées antérieures MUST
rester exactes.

#### Scenario: Jeu source aligné
- **WHEN** le jeu 1.10.6 est qualifié
- **THEN** chaque composant versionné annonce 1.10.6 et les références à 1.10.5 ne désignent que des historiques ou versions chargées compatibles
