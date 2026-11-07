## MODIFIED Requirements

### Requirement: Statistiques filtrées et explicites
STATS MUST lire exclusivement SGS par IPC local et permettre une sélection du projet et du RUN. Les mesures natives, périodes de modèles, couvertures, événements paginés, sources de briques et contributions archivées MUST rester distincts et consultables. Aucune source contrôleur ne MUST remplacer SGS indisponible. Les champs absents MUST rester N/A et les métriques recouvrantes MUST NOT être additionnées. Les cumuls SGS MUST NOT être présentés comme des fenêtres temporelles non calculées.

#### Scenario: SGS indisponible
- **WHEN** le service statistique est inaccessible
- **THEN** STATS conserve son état d’indisponibilité sans substituer les anciens magasins du contrôleur

#### Scenario: Import et natif recouvrants
- **WHEN** SGS conserve des mesures natives et un rapport archivé du même change
- **THEN** STATS présente leurs provenances séparément sans les additionner

#### Scenario: Contrôleur indisponible
- **WHEN** le contrôleur est inaccessible mais SGS reste disponible
- **THEN** STATS présente les données de SGS sans substituer la panne du contrôleur à son état

### Requirement: Purge manuelle à borne explicite
La page STATS2.4 MUST NOT proposer la purge des anciens magasins statistiques du contrôleur. Les anciennes routes de rétention du moniteur MUST refuser une mutation sans effet. L’effacement terminal des buffers MUST passer par les reçus de clôture après rapport durable ; la suppression des copies archivées CAB MUST rester dans ARCHIVES et ne MUST NOT supprimer l’historique SGS validé.

#### Scenario: Ancienne route de purge
- **WHEN** un client appelle une ancienne route de rétention statistique depuis le moniteur
- **THEN** la requête est refusée sans purge SGS, RUN ou archive

#### Scenario: Borne exacte et annulation
- **WHEN** une ancienne prévisualisation est annulée ou un client transmet son ancienne borne de purge
- **THEN** aucune donnée n’est supprimée par les routes de rétention désactivées du moniteur2.4
