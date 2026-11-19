## MODIFIED Requirements

### Requirement: Baseline historique et propreté actuelle distinguées
Un statut dirty historique MUST NOT empêcher une réservation lorsque le chemin actuellement propre correspond aux octets du HEAD observé et au mode exécutable si Git le suit. CAB MUST respecter core.filemode=false sans changer les permissions ni la configuration. CAB MUST journaliser ce constat sans modifier la baseline ni reconstruire le contenu historique.

#### Scenario: Modifications précédentes publiées
- **WHEN** un chemin dirty à la capture initiale est désormais propre et identique à HEAD selon les règles de suivi Git
- **THEN** CAB autorise sa réservation actuelle et conserve le constat historique

#### Scenario: Mode exécutable ignoré par Git
- **WHEN** core.filemode=false, les octets correspondent à HEAD et seul le bit exécutable diffère
- **THEN** CAB autorise la réservation sans chmod, changement de configuration ou de baseline

#### Scenario: Statut clean sans concordance de contenu
- **WHEN** le statut masque des octets différents de HEAD, même avec core.filemode=false
- **THEN** CAB refuse la prise en charge automatique

#### Scenario: Mode suivi ou configuration instable
- **WHEN** Git suit un mode divergent ou la configuration est invalide ou change pendant la comparaison
- **THEN** CAB refuse la prise en charge automatique
