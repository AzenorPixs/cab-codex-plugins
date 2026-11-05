## MODIFIED Requirements

### Requirement: Interface explicite de récupération
POST /job/recover MUST accepter prepare, retry et complete, corrélés par jobId, expectedSessionId, sessionId, recoveryId et preflightRequestId uniques. Le contrôleur MUST refuser les mutations concurrentes pendant la transition. Il MUST NOT désarmer le job, purger le RUN, fabriquer une décision ou valider le gate pour ce remplacement.

#### Scenario: Transition concurrente
- **WHEN** une mutation est demandée pendant un contrôle asynchrone de récupération
- **THEN** elle est refusée sans modifier le contrat

### Requirement: Préconditions techniques de récupération
prepare, retry et complete MUST vérifier un job armé avec gate OPEN, mandat courant clôturé, aucune demande indécise, aucun rappel, aucune permission native ni transmission en cours. Via OpenCode dans directory, ils MUST vérifier santé, chemin, MCP connecté et les deux sessions inactives dans cette racine. Un contrôle indisponible ou divergent MUST refuser la transition.

#### Scenario: Précondition manquante
- **WHEN** une permission, une session occupée, une demande indécise ou un contexte divergent est observé
- **THEN** la transition est refusée sans transfert ni approbation implicite

## ADDED Requirements
### Requirement: Retry explicite dans la candidate conservée
retry MUST conserver jobId, expectedSessionId, sessionId et recoveryId. Il MUST exiger previousPreflightRequestId égal à la réservation courante et preflightRequestId inédit. Il MUST conserver gel, gate, jalons et critères, réserver seulement le nouvel essai et persister son historique sans modifier les décisions antérieures.

#### Scenario: Identité périmée ou session différente
- **WHEN** retry réutilise un identifiant, change de session ou présente une réservation périmée
- **THEN** le contrôleur refuse sans changer le job

### Requirement: Refus natif sans effet avant retry
retry MUST vérifier les préconditions techniques et le refus sans consommation de la tentative précédente. Il MUST refuser une preuve absente, un délai seul, une décision approved, une commande ou un autre outil natif. Il MUST conserver les preuves historiques sans les traiter comme le prévol du nouvel essai.

#### Scenario: Refus enregistré
- **WHEN** une réponse native REJECTED correspond à une décision locale rejected non consommée
- **THEN** retry MAY réserver un essai neuf dans la même candidate après réconciliation

#### Scenario: Refus avant enregistrement
- **WHEN** une erreur native MCP -32602 prouve un rejet de paramètres avant enregistrement, sans validation locale ni effet
- **THEN** retry MAY conserver cette preuve et réserver un essai neuf

#### Scenario: Effet ou décision non prouvé
- **WHEN** la tentative est approuvée, consommée, en attente ou seulement interrompue
- **THEN** retry refuse et le gel reste conservé

### Requirement: Frontière native vérifiée entre tentatives
retry MUST persister une empreinte du préfixe des parties tool natives et les identifiants antérieurs sans contenu de message. retry et complete MUST vérifier que ce préfixe reste identique et contrôler le nouvel essai après cette frontière. Les identifiants de requête et approbation antérieurs MUST NOT être réutilisés.

#### Scenario: Historique altéré ou tronqué
- **WHEN** une partie native antérieure est perdue, changée ou réordonnée
- **THEN** la transition refuse sans transfert ni autorisation implicite

#### Scenario: Nouveau prévol exact
- **WHEN** les preuves historiques sont intactes et le nouvel essai satisfait les contrôles stricts existants
- **THEN** complete accepte le même job et la même candidate sans compter les refus précédents comme des exécutions
