## MODIFIED Requirements

### Requirement: Rapport des versions après redémarrage
Le rapport post-redémarrage MUST séparer source publiée, plugin, fichiers et processus controller/supervisor/monitor. Il MUST afficher le broker fichier; si OpenCode V2 est absent, non authentifié, d'une version majeure différente de 2 ou si sa réponse V2 est invalide, son runtime MUST être `INDISPONIBLE`, sans bloquer le compte rendu explicite des autres briques. Une version non observée MUST NOT être déduite des fichiers et aucun repli vers OpenCode 1.x MUST être tenté.

#### Scenario: Broker de mauvaise version après reconnexion
- **WHEN** la readiness indique une ancienne version du broker
- **THEN** le rapport conserve la version active comme non vérifiée et confirme séparément que les fichiers broker ciblés ont été installés

#### Scenario: Redémarrage natif du broker OpenCode
- **WHEN** OpenCode est accessible et le broker CAB est connecté avant l'update
- **THEN** CAB tente `disconnect`, remplace les fichiers, puis tente `connect` et rapporte la readiness obtenue sans tuer OpenCode
