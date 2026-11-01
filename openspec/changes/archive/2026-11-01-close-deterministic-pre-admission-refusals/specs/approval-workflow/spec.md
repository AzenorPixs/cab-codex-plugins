## ADDED Requirements

### Requirement: Clôture d’un refus déterministe avant admission
Pour une approval `PENDING`, le broker MUST produire `NOT_ADMITTED` lorsqu’une
notification au contrôleur échoue avec un diagnostic HTTP 400 ou 409 filtré,
connu et déterministe. L’état MUST rester distinct de toute décision humaine
et MUST préserver le diagnostic d’origine.

#### Scenario: Refus de révision périmée
- **WHEN** le contrôleur refuse l’admission avec `resource-revision-stale`
- **THEN** `request_validation` et le poll corrélé retournent `NOT_ADMITTED`,
  sans `decision_id`, accès, permission native ou nouvelle notification

#### Scenario: Diagnostic déterministe préexistant
- **WHEN** une approval historique reste `PENDING` avec `notification_status=FAILED`
  et un diagnostic filtré HTTP 400/409 connu
- **THEN** le prochain poll ou la réconciliation broker la clôt en
  `NOT_ADMITTED` et journalise la transition sans écraser l’erreur

### Requirement: Conservation des erreurs non déterministes
Le broker MUST conserver `PENDING` lorsque la notification échoue sans
diagnostic filtré connu, après un timeout réseau, ou avec un statut HTTP hors
de la liste déterministe. Il MUST préserver les règles actuelles de retry
borné sans transformer l’échec en approbation ou rejet.

#### Scenario: Erreur réseau ou code inconnu
- **WHEN** le contrôleur est inaccessible, retourne un 5xx, ou renvoie un code
  absent de la liste autorisée
- **THEN** l’approval reste `PENDING`, son diagnostic inconnu n’est pas
  inventé et le comportement de retry existant s’applique

### Requirement: Aucun retry du même refus
Une approval `NOT_ADMITTED` MUST être terminale et non décidable. Toute nouvelle
tentative exige une nouvelle identité de requête et des révisions relues ;
elle n’est jamais créée automatiquement par le broker.

#### Scenario: Nouvelle demande après révision actualisée
- **WHEN** l’orchestrateur relit les révisions et prépare une nouvelle demande
  exacte après `NOT_ADMITTED`
- **THEN** seul le nouveau `requestId` peut être soumis à une décision CAB
  indépendante ; l’ancienne approval ne reçoit ni décision ni permission
