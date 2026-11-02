## ADDED Requirements

### Requirement: Arrêt certifié préservant l’autorité du registre

Pour un transfert préparé, CABU MUST arrêter le seul processus principal du contrôleur puis attendre sa fin avant l’arrêt du groupe systemd sélectionné. Le helper d’autorité MUST rester vivant jusqu’au scellement. L’unité distribuée MUST utiliser KillMode=mixed. CABU MUST conserver l’exigence d’adoption du transfert et le repli sur échec ; il MUST NOT arrêter OpenCode ou libérer une ressource métier pour réaliser cette transition.

#### Scenario: Ancienne unité en control-group

- **GIVEN** un transfert préparé et une unité qui signale tous les membres du groupe
- **WHEN** CABU remplace le contrôleur
- **THEN** SIGTERM cible d’abord le principal ; le helper reste disponible pour sceller, puis le groupe est arrêté

#### Scenario: Principal qui ne termine pas

- **WHEN** la fin du principal ne peut pas être confirmée
- **THEN** CABU conserve un échec explicite sans inventer un transfert adopté
