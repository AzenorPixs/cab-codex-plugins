## ADDED Requirements

### Requirement: Confirmation OCI et réconciliation des publications Docker

CAB MUST confirmer la version et latest avant toute suppression d'anciens tags, y compris lorsque l’identifiant Docker local représente le descripteur de l'index ou du manifeste OCI. La confirmation par descripteur exige que chaque tag pointe vers l'empreinte attendue.

#### Scenario: Image OCI avec attestations

- **WHEN** l’identifiant local est l’empreinte de l'index OCI et les deux tags distants pointent vers cet index
- **THEN** CAB confirme la publication et peut poursuivre la politique de rétention.

#### Scenario: Réconciliation administrative d'une confirmation incertaine

- **WHEN** l'administration fournit le reçu UNKNOWN précis à l'étape registry-confirmation, la version et l'empreinte attendues, et CAB vérifie la configuration, l'image locale et les tags distants
- **THEN** CAB conserve le reçu initial, enregistre la confirmation observée sur le même reçu et libère sa protection sans push ni suppression.
- **AND WHEN** une preuve manque ou diverge
- **THEN** CAB conserve le reçu UNKNOWN et sa protection.
