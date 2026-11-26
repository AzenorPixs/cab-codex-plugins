## ADDED Requirements

### Requirement: Travail de fond CAB borné
CAB MUST éviter de relire les métadonnées locales stables au rattrapage ordinaire, traiter régulièrement les RUN actifs et examiner les clôtures historiques par lots. La supervision MCP MUST rester permanente et conserver les échéances des opérations en cours ainsi que les protections des effets inconnus.

#### Scenario: Sources de métadonnées stables
- **WHEN** un contrôle de secours confirme que les sources de métadonnées ont conservé leurs signatures après une synchronisation réussie
- **THEN** CAB ne relance pas la synchronisation de ces sources

#### Scenario: Réconciliation concurrente
- **WHEN** un RUN actif ou une reprise MCP requiert un traitement pendant un balayage historique
- **THEN** CAB conserve une cadence propre aux files actives et applique les gardes existantes avant chaque effet
