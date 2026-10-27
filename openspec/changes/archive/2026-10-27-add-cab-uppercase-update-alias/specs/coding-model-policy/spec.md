## MODIFIED Requirements

### Requirement: Catalogue public configurable et compatibilité
CAB MUST accepter OC_Codex_PLLM_CATALOG absolu, avec l'alias OC_CGPT_PLLM_CATALOG en absence du nom principal, pour le pllm-current.json public du skill actif. La lecture MUST rester bornée sans secret ni écriture de catalogue. Les anciens jobs sans négociation MUST rester lisibles. Le protocole 1.10.5 MUST exiger pllm-auto-v1 avant un nouveau job piloté ; la préparation source MUST NOT modifier les agents ou fournisseurs actifs.

#### Scenario: Catalogue manquant ou lien symbolique
- **WHEN** la sélection automatique ne peut lire le catalogue public configuré en sécurité
- **THEN** elle échoue avec diagnostic sans lire de stockage privé ni créer une politique
