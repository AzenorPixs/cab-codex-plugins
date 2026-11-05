## MODIFIED Requirements

### Requirement: Collecte auditable par spécification

L'orchestrateur CAB SHALL charger le skill embarqué `coding-session-statistics` et
préparer la collecte au début de chaque change piloté. L'orchestrateur CAB SHALL
conserver les bornes temporelles, l'identité du change et de la session, le relevé du
quota hebdomadaire Codex et les sondes prévues par le skill. L'orchestrateur CAB SHALL
utiliser l'outil natif de lecture des quotas sans exiger le skill `cgpt`.

#### Scenario: Collecte commencée tardivement

- **WHEN** le début de la session ou le quota initial n'a pas été mesuré
- **THEN** le rapport indique `N/A` motivé et utilise seulement les preuves disponibles

#### Scenario: Quota inaccessible ou réinitialisé

- **WHEN** l'outil est indisponible ou les deux relevés ne concernent pas la même fenêtre du même compte
- **THEN** le rapport indique `N/A` pour la différence sans empêcher la rédaction des autres statistiques

### Requirement: Rapport obligatoire après chaque archivage réussi

Après chaque archivage OpenSpec explicitement autorisé et réussi, l'orchestrateur SHALL
faire produire `STATISTIQUES.md` dans le dossier réel
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

### Requirement: Données statistiques absentes ou tardives

L'orchestrateur CAB SHALL signaler `N/A` avec sa cause pour toute donnée inaccessible ou
collecte tardive et SHALL ne jamais reconstruire rétroactivement une mesure.

#### Scenario: Données statistiques absentes ou tardives
- **WHEN** une mesure est inaccessible ou la collecte commence tardivement
- **THEN** le rapport indique N/A avec sa cause sans reconstruire la mesure

### Requirement: Rapport individuel pour chaque archive

Chaque archive SHALL posséder son propre rapport, y compris dans un lot.

#### Scenario: Rapport individuel pour chaque archive
- **WHEN** plusieurs changes sont archivés dans un lot autorisé
- **THEN** chaque archive reçoit son propre rapport
