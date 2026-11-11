## ADDED Requirements

### Requirement: Fonctionnement CAB avec permissions de groupe

CAB MUST accepter le mode 0770 pour les fichiers et répertoires qu'il utilise
et créer ses nouveaux fichiers en 0770. Il MUST accepter les autres modes
lorsque les droits POSIX et les invariants du protocole permettent l'opération.
Il MUST préserver les vérifications de type, propriété, liens et intégrité
nécessaires et MUST signaler les restrictions effectives des services tiers.

#### Scenario: État normalisé par DIU
- **WHEN** un état CAB existant est en 0770 et accessible à son processus
- **THEN** CAB poursuit l'opération sans rejeter ce seul mode

#### Scenario: Ancien état compatible
- **WHEN** un état dispose d'un autre mode et respecte les conditions POSIX et les invariants applicables
- **THEN** CAB peut poursuivre sans exiger sa normalisation

#### Scenario: Accès ou intégrité impossibles
- **WHEN** un accès effectif échoue ou un invariant de type, lien, identité ou intégrité est violé
- **THEN** CAB retourne un diagnostic et conserve les protections et les effets incertains
