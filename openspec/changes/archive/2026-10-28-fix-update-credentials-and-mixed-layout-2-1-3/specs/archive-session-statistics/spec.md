## MODIFIED Requirements

### Requirement: Rapport obligatoire après chaque archivage réussi

Après chaque archivage OpenSpec explicitement autorisé et réussi, l'orchestrateur SHALL
faire produire `STATISTICS.md` dans le dossier réel
`openspec/changes/archive/<archive>/`. L'orchestrateur CAB SHALL relever les quotas
finaux et la fin de session après archivage et avant la synthèse. Le rapport SHALL
respecter les six sections du skill, les pourcentages, les preuves disponibles, les
durées et la distinction entre refus, erreur et exécution réussie.

#### Scenario: Archivage unitaire réussi

- **WHEN** la preuve d'archivage d'un change est observée
- **THEN** un mandat d'édition distinct autorise son rapport, puis son existence, ses six sections et sa cohérence sont vérifiées avant clôture

#### Scenario: Plusieurs changes archivés

- **WHEN** plusieurs changes sont archivés dans le même job
- **THEN** chacun reçoit un rapport avec son périmètre et ses bornes explicites ; les mesures globales ou partagées sont signalées sans attribution inventée
