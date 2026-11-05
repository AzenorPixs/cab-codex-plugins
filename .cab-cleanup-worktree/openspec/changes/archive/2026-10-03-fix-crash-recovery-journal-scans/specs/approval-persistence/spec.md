## ADDED Requirements

### Requirement: Recherches indexées pendant la récupération initiale
CAB SHALL construire un index temporaire des couples `(approval_id, event_type)`
depuis une seule lecture initiale du journal pour les recherches de présence
de la première boucle de réparation après un arrêt non propre. CAB SHALL
préserver les validations d'identifiants, les écritures durables, les contrôles
de cohérence et d'intégrité, les verrous et les règles de reprise existants.
CAB SHALL NOT conserver cet index dans un cache global ou le réutiliser après
cette boucle. Une recherche sans index SHALL conserver son comportement actuel.

#### Scenario: Journal déjà cohérent
- **WHEN** le broker reprend après un arrêt non propre et les événements de création et terminaux des approbations existent déjà
- **THEN** les recherches de présence de la première boucle utilisent l'index sans relire le journal pour chaque approbation
- **AND** aucun événement de création ou terminal supplémentaire n'est ajouté

#### Scenario: Événement manquant
- **WHEN** la récupération initiale rencontre un événement fondamental manquant
- **THEN** CAB le répare selon les règles existantes et actualise l'index seulement après l'écriture durable réussie
- **AND** une répétition de cette réparation ne crée aucun doublon

#### Scenario: Échec de lecture ou d'écriture
- **WHEN** la lecture du journal ou l'écriture d'un événement échoue
- **THEN** CAB propage l'erreur selon le contrat existant et ne considère pas une écriture échouée comme présente dans l'index

#### Scenario: Divergence ambiguë
- **WHEN** le journal contredit le magasin pendant la récupération
- **THEN** CAB conserve les contrôles existants et exige HUMAN_REQUIRED sans inventer de décision métier
