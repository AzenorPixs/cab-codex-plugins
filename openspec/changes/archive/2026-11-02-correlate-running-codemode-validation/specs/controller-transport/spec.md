## ADDED Requirements

### Requirement: Corrélation d’un appel Code Mode de validation en cours

Le contrôleur MUST corréler un appel `request_validation` natif unique visible dans un wrapper Code Mode `execute` en cours seulement si ses identités et métadonnées exactes sont présentes. Cette admission MUST NOT créer de décision, permission ou `once`, et MUST NOT être bloquée par un accès restauré sur des ressources disjointes du même RUN.

#### Scenario: Appel exact en cours avec ressource disjointe

- **WHEN** `execute` est `running`, `executed=false`, non tronqué, et porte comme seul appel MCP courant `request_validation` `running` dont l’identité complète correspond, alors qu’un accès restauré `HELD` vise une ressource disjointe
- **THEN** CAB admet et enregistre la demande exacte sans refuser sur cet accès disjoint
- **AND** l’accès restauré reste `HELD` et aucune décision, permission ou `once` n’est créée
- **AND** toute acquisition ultérieure reste atomique et un ensemble recouvrant attend

#### Scenario: Recherche exacte avant validation

- **WHEN** l’unique `request_validation` courant correspond exactement et est précédé d’une unique recherche `search` terminée, sans autre appel
- **THEN** CAB admet la demande avec les mêmes gardes d’identité et d’absence d’autorité implicite

#### Scenario: Wrapper actif incomplet ou divergent

- **WHEN** le wrapper est tronqué, exécuté, sans métadonnées complètes, avec appel non `running`, appels supplémentaires ou identité native divergente
- **THEN** CAB refuse la demande avant d’enregistrer propriétaire, validation ou décision

#### Scenario: Appel recouvrant après admission

- **WHEN** la demande exacte a été admise mais l’ensemble demandé recouvre un accès `HELD`
- **THEN** aucune acquisition partielle ou permission native n’est créée et l’acquisition attend la résolution du conflit
