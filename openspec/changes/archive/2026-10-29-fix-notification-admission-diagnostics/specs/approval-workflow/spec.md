## ADDED Requirements

### Requirement: Diagnostic de notification structuré et filtré

Le broker MUST conserver un diagnostic optionnel du dernier échec de notification : statut HTTP et code reconnu dans une liste fermée pour ce statut, sinon code inconnu. La lecture MUST rester bornée à1024 octets et MUST NOT recopier un message distant ou des champs arbitraires. Le diagnostic command-too-long existant MUST être préservé. Un échec de notification MUST NOT créer de décision, admission ou permission.

#### Scenario: Révision attendue périmée
- **WHEN** le contrôleur retourne409 avec resource-revision-stale
- **THEN** le broker expose ce code filtré et conserve PENDING/FAILED sans décision implicite

#### Scenario: Corps non fiable
- **WHEN** le corps est inconnu, trop grand, invalide ou contient des champs arbitraires
- **THEN** aucun contenu distant arbitraire n’est exposé et le diagnostic HTTP générique reste disponible

### Requirement: Persistance du diagnostic sous lease courante

Le diagnostic MUST être enregistré seulement par la lease courante de notification. Une ancienne lease MUST NOT l’écraser. Une livraison suivante MUST actualiser son état sans faire passer l’ancien échec pour un refus courant. Les anciennes approbations sans diagnostic MUST rester compatibles ; tentatives et statut métier MUST rester distincts.

#### Scenario: Lecture après échec
- **WHEN** la notification échoue sous sa lease courante puis l’approbation est relue
- **THEN** son diagnostic filtré reste disponible avec ses tentatives sans altérer sa décision métier

#### Scenario: Lease périmée ou livraison réussie
- **WHEN** un résultat périmé arrive ou que la notification suivante réussit
- **THEN** le résultat périmé est ignoré et une livraison réussie ne conserve aucun faux refus courant

## MODIFIED Requirements

### Requirement: Lecture bornée du diagnostic contrôleur

Le broker MUST borner sa lecture du corps d'erreur et MUST NOT recopier le message distant ni des champs supplémentaires. Une réponse non reconnue, excessive, malformée ou illisible MUST conserver le diagnostic HTTP générique.

#### Scenario: Diagnostic non fiable
- **WHEN** le corps contient un message arbitraire, des longueurs invalides, un code hors de la liste fermée du statut HTTP, une autre unité, un contenu excessif ou une erreur de lecture
- **THEN** le broker conserve le diagnostic HTTP générique sans journaliser ce contenu

