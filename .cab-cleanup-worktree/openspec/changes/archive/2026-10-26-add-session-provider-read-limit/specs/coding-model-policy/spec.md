## ADDED Requirements

### Requirement: Budget fournisseur imposé par la session de pilotage
La session MUST pouvoir fournir providerMaxBytes dans POST /model-policy/resolve et dans modelSelection à l'armement. CAB MUST accepter un entier sûr strictement positif en octets, l'appliquer au seul /provider de l'appel et refuser les valeurs invalides avant observation. CAB MUST NOT ajouter de plafond fixe à une valeur valide.

#### Scenario: Budget explicite suffisant
- **WHEN** la session fournit un budget suffisant, y compris au-delà de 16 Mio
- **THEN** CAB résout et prévole le modèle avec ce budget sans configuration globale ou changement implicite de modèle

#### Scenario: Budget invalide
- **WHEN** la valeur n'est pas un entier sûr strictement positif
- **THEN** CAB refuse avec diagnostic fixe avant toute observation native

### Requirement: Limite locale et compatibilité des observations
Sans providerMaxBytes, CAB MUST conserver le défaut compatible de 2 Mio. Le budget MUST NOT modifier les limites des autres observations ou du catalogue PLLM, les modèles existants ou les permissions. Un appel MUST NOT hériter du budget d'un autre appel.

#### Scenario: Omission et autre observation
- **WHEN** un nouvel appel omet le budget ou observe une session ou un message
- **THEN** la borne compatible de 2 Mio reste appliquée

### Requirement: Dépassement et confidentialité du fournisseur
CAB MUST interrompre le flux /provider au dépassement du budget avant parsing. Le corps natif MUST NOT être exposé dans les retours, erreurs, journaux ou jobs.

#### Scenario: Flux trop grand
- **WHEN** le flux dépasse le budget choisi par la session
- **THEN** CAB refuse avec un diagnostic fixe sans corps privé

## MODIFIED Requirements

### Requirement: Catalogue public configurable et compatibilité
CAB MUST accepter OC_Codex_PLLM_CATALOG absolu, avec l'alias OC_CGPT_PLLM_CATALOG en absence du nom principal, pour le pllm-current.json public du skill actif. La lecture MUST rester bornée sans secret ni écriture de catalogue. Les anciens jobs sans négociation MUST rester lisibles. Le protocole 1.10.2 MUST exiger pllm-auto-v1 avant un nouveau job piloté ; la préparation source MUST NOT modifier les agents ou fournisseurs actifs.

#### Scenario: Catalogue manquant ou lien symbolique
- **WHEN** la sélection automatique ne peut lire le catalogue public configuré en sécurité
- **THEN** elle échoue avec diagnostic sans lire de stockage privé ni créer une politique
