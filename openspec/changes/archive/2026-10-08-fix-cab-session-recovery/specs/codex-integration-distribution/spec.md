## ADDED Requirements

### Requirement: Prévention des outils natifs en lecture seule
Le protocole distribué MUST demander à l'orchestrateur de désactiver explicitement bash, edit, write, apply_patch, task et skill pour tout mandat d'inventaire ou d'analyse en lecture seule. Les outils de lecture et recherche autorisés MAY rester disponibles. 

#### Scenario: Inventaire protégé
- **WHEN** un inventaire lecture seule est transmis par l'API de messagerie OpenCode
- **THEN** ses outils natifs et d'écriture sont désactivés explicitement et aucun mandat exécutable implicite n'est accordé

### Requirement: Réactivation limitée des outils exécutables
La restriction lecture seule MUST NOT modifier la configuration persistante OpenCode ni produire une approbation générale. Un futur mandat exécutable MUST réactiver uniquement ses outils nécessaires, conserver une permission native ask et un mandat CAB unitaire.

#### Scenario: Mandat exécutable suivant
- **WHEN** l'orchestrateur passe d'un inventaire à une opération native
- **THEN** seuls les outils nécessaires sont réactivés et l'opération exige sa propre décision CAB
