## MODIFIED Requirements

### Requirement: Arrêt certifié préservant l’autorité du registre

Pour un transfert préparé, CABU MUST signaler le seul principal du contrôleur avant le groupe, en préservant le helper jusqu’au scellement. Il MUST confirmer MainPID=0 avec état inactive ou failed ; tout PID vivant ou deactivating MUST rester refusé. L’unité MUST utiliser KillMode=mixed. L’adoption exacte reste obligatoire ; un code de sortie ne la remplace pas. CABU MUST préserver OpenCode et les ressources métier et conserver le repli sur échec.

#### Scenario: Ancienne unité en control-group

- **GIVEN** un transfert préparé et une unité qui signale tous les membres du groupe
- **WHEN** CABU remplace le contrôleur
- **THEN** SIGTERM cible d’abord le principal ; le helper reste disponible pour sceller, puis le groupe est arrêté

#### Scenario: Principal arrêté en failed

- **WHEN** le principal est absent, MainPID vaut 0 et l’unité est failed
- **THEN** CABU peut arrêter le groupe et poursuivre, mais le contrôleur cible doit adopter le certificat exact avant tout succès

#### Scenario: Principal qui ne termine pas

- **WHEN** le principal reste vivant ou sa fin ne peut pas être confirmée
- **THEN** CABU conserve un échec explicite sans inventer un transfert adopté
