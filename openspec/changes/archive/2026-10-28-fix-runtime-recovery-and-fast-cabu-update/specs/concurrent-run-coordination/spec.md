## ADDED Requirements

### Requirement: Perte d'autorité récupérable sans faux service sain
Le contrôleur MUST refuser les mutations après perte d'autorité. Il MUST sortir en échec pour permettre la restauration systemd plutôt que rester indéfiniment vivant avec registry-unavailable. Les fichiers durables MUST rester conservés et aucun verrou concurrent MUST être contourné.

#### Scenario: Helper de verrou interrompu
- **WHEN** le helper d'autorité se termine hors arrêt volontaire
- **THEN** le contrôleur devient indisponible puis redémarre en restaurant le registre, sans rejouer les décisions consommées
