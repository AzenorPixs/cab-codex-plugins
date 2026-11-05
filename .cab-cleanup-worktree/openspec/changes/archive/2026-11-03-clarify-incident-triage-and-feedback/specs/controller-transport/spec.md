## ADDED Requirements

### Requirement: Qualifier les signalements avant correction et capitaliser les ambiguïtés
Le protocole CAB SHALL distinguer défaut reproduit, procédure existante,
observation historique, preuve insuffisante et protection légitime avant de
conclure. Un faux positif établi et généralisable SHALL compléter la référence
canonique minimale si nécessaire, avec routage skill/commande cohérent et
cycle SCM applicable, sans nouvelle autorisation métier ou rejeu d’effet.

#### Scenario: Catalogue observé sur la mauvaise surface
- **GIVEN** broker_readiness absent du catalogue Codex seulement
- **WHEN** le pilote prépare une reprise mandatée
- **THEN** il vérifie le catalogue OpenCode conformément au contrat sans conclure à une panne du broker

#### Scenario: Preuve historique absente du contrôleur courant
- **GIVEN** un ancien call et evidence=null
- **WHEN** le signalement est qualifié
- **THEN** le pilote compare dates/contexte/rétention sans attribuer une cause non prouvée ou réutiliser une identité terminale
