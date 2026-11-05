## ADDED Requirements

### Requirement: Distribution du porte-mandat2.1.25
Les briques CAB2.1.25 MUST distribuer staging, lanceur et procédure dans skill/commande/référence. Les tests MUST couvrir payload long natif exact, accès/once obligatoires, substitution, altération, contexte étranger et restauration. SCM/publications MUST précéder CABU vérifié puis information des sessions ; aucun plugin ou changement d’OpenCode MUST être imposé.

#### Scenario: Adoption après activation
- **WHEN** la livraison est qualifiée et activée
- **THEN** les propriétaires préparent de nouveaux mandats scellés et conservent anciens travaux, permissions et identités
