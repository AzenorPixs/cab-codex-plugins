## ADDED Requirements

### Requirement: File locale compatible avec le groupe

Le reporting du broker MUST accepter les répertoires 0770 et 2770 détenus par
son utilisateur ainsi que les anciens modes privés compatibles. Les fichiers
nouvellement créés MUST être en 0770. Les liens et accès aux autres comptes
incompatibles avec la confidentialité MUST être refusés.

#### Scenario: Répertoire local normalisé
- **WHEN** la file locale est détenue par le broker et en 2770
- **THEN** le broker peut enregistrer, relayer et relire les déclarations
