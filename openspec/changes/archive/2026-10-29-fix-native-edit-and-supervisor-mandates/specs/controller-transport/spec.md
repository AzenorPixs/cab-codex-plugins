## ADDED Requirements

### Requirement: Retry d’un refus MCP V2 avant enregistrement

Une récupération MAY reprendre après refus MCP V2 avant enregistrement seulement si la preuve native structurée, son enveloppe complète, les identités exactes de l’appel, l’absence de demande enregistrée et l’absence d’effet établissent ce refus. Une chaîne d’erreur libre, un timeout ou une approbation consommée MUST NOT suffire. Le retry MUST conserver job, RUN, candidate et historique et exiger une nouvelle identité de prévol. Les permissions et effets non résolus MUST rester bloquants.

#### Scenario: Refus natif structuré sans enregistrement
- **WHEN** la preuve native corrélée établit le rejet de validation avant enregistrement et exclut tout autre effet
- **THEN** retry conserve la candidate et prépare uniquement un prévol neuf sans décision reconstruite

#### Scenario: Texte libre ou état divergent
- **WHEN** l’enveloppe, le type de refus, les identités, l’absence d’enregistrement ou la frontière native ne sont pas prouvés
- **THEN** le retry reste refusé sans émission de once ni perte des preuves

### Requirement: Changements natifs SSE V2 pris en compte

Le contrôleur MUST invalider ses observations de génération sur les événements natifs V2 de démarrage et fin d’exécution ou de changement de permission corrélés aux sessions contrôlées. Il MUST NOT interpréter un événement sans identité vérifiable comme une preuve d’inactivité ou de permission. Les états statistiques de session MUST distinguer activité, fin native et permission sans transformer un événement en décision CAB.

#### Scenario: Exécution V2 corrélée
- **WHEN** une exécution démarre ou finit sur une session contrôlée et son événement V2 porte une identité valide
- **THEN** l’observation de génération est invalidée et l’état statistique peut être actualisé sans décision implicite

#### Scenario: Session étrangère
- **WHEN** l’événement concerne une autre session ou n’établit pas son identité
- **THEN** il ne prouve ni disponibilité ni effet de la session contrôlée

### Requirement: Schéma de référence d’accès non vide

Le schéma MCP MUST refuser un access_id vide ou invalide et documenter son omission lorsqu’aucun accès existant n’est référencé. Le validateur du broker MUST continuer de refuser une valeur invalide avant toute persistance.

#### Scenario: Référence absente
- **WHEN** aucun accès existant n’est référencé
- **THEN** la clé access_id peut être omise et une chaîne vide reste refusée sans créer d’approbation
