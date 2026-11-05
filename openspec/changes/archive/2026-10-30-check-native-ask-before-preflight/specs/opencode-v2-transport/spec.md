## ADDED Requirements

### Requirement: Contrôle explicite ask avant envoi du prompt
Le client MUST proposer requiredNativeAsk sur prompt pour vérifier le SID/répertoire et les permissions natives avant envoi. Les exigences MUST être shell/edit explicites et nonvides. Une règle deny, allow, absente ou insuffisante MUST bloquer sans prompt, demandeMCP, PATCH ou once. Le contrôle MUST partager la résolution existante du contrôleur, dont les gardes indépendantes MUST rester inchangées.

#### Scenario: Prévol après revue en deny
- **WHEN** un nouveau prévol exige shell ask mais la session reste deny
- **THEN** le client refuse avant envoi et indique la politique observée sans la modifier

#### Scenario: Changement après observation
- **WHEN** la politique change après le contrôle client
- **THEN** le contrôleur conserve son refus à l’admission ou à once, sans autorisation implicite

### Requirement: Inspection de politique sans restauration automatique
Le client MUST exposer une inspection filtrée et une empreinte de politique natives. Sans exigence structurée, les prompts historiques de revue sans outil MUST rester possibles sous deny. Aucun contrôle, CABU ou prévol MUST rétablir automatiquement ask/allow ni modifier les autres sessions, modèles ou protections.

#### Scenario: Revue sans outil
- **WHEN** le propriétaire demande une proposition en lecture seule sous deny sans exigence native
- **THEN** le prompt reste possible sans levée de règle
