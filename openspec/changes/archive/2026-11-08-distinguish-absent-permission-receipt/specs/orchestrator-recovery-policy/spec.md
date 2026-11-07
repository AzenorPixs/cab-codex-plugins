## ADDED Requirements

### Requirement: Diagnostic exact d'un reçu absent
La lecture exacte d'un reçu SHALL distinguer un fichier absent d'un fichier invalide. L'absence SHALL NOT prouver qu'aucun effet n'a eu lieu ni autoriser à elle seule un rejet ou un rejeu. Les reçus invalides et les issues incertaines SHALL rester protégés.

#### Scenario: Reçu exact absent
- **WHEN** aucune enveloppe n'existe à l'identité exacte
- **THEN** le client signale l'absence sans la qualifier de corruption et sans créer de reçu

#### Scenario: Enveloppe exacte invalide
- **WHEN** l'enveloppe existe mais est invalide ou divergente
- **THEN** le client signale l'invalidité sans modifier le fichier
