## ADDED Requirements

### Requirement: Prévol d’accès au registre Docker des forges

CAB MUST vérifier l’accès à l’inventaire des versions sur Forgejo, GitHub et GitLab avant le premier effet de publication Docker. Pour GHCR, CAB MUST refuser un jeton personnel finement configuré et présenter un diagnostic sur le jeton classique et les habilitations de lecture, d’envoi et de rétention, sans exposer le jeton.

#### Scenario: Refus de configuration ou de lecture du paquet

- **WHEN** le jeton personnel est finement configuré ou la lecture de l’inventaire du registre retourne 401 ou 403
- **THEN** CAB consigne l’échec au prévol avec les habilitations propres à la forge et ne lance aucun étiquetage Docker ni envoi.

#### Scenario: Paquet personnel détenu par le compte authentifié

- **WHEN** le compte GitHub authentifié possède le namespace personnel du dépôt
- **THEN** CAB inventorie les versions et opère la rétention par le chemin authentifié du compte, y compris pour un paquet privé.
