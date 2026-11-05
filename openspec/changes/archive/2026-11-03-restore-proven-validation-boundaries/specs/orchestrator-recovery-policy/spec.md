## ADDED Requirements

### Requirement: Restaurer une validation PENDING propriétaire sans nouvelle demande
Le système SHALL permettre au propriétaire de restaurer la communication de
la même approval PENDING quand l’opération durable PREPARED n’a ni décision,
native ni accès, après vérification native fraîche, non expirée, double
observation stable et identité/ressources/contexte actuels. Cette action SHALL
persister un reçu sans créer de décision, demande MCP ou permission.

#### Scenario: Notification perdue mais identité durable vérifiée
- **GIVEN** une policy propriétaire autorisant restore-pending-validation et une lecture get_approval fraîche PENDING concordante
- **WHEN** la double frontière native est stable et la validation manque
- **THEN** le contexte restaure la même identité sans modifier l’opération et une décision distincte reste nécessaire

#### Scenario: Identité, temps ou effet contradictoire
- **GIVEN** un terminal contradictoire, une lecture périmée, un effet correspondant, une autre validation active ou une révision divergente
- **WHEN** la restauration est demandée
- **THEN** elle est refusée sans décision, accès ou permission créé

### Requirement: Clôturer la coordination d’un terminal de lecture revu sans inventer once
Le système SHALL permettre une clôture propriétaire bornée après revue READ_ONLY
liée à la commande, aux sources épinglées et à un unique terminal natif exact,
quand PREPARED approved n’a ni native ni accès. Il SHALL conserver l’issue
NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED et ne fabriquer ni once, ni
nativeResult, ni NO_EFFECT. Une policy et deux observations stables sont requises.

#### Scenario: Terminal exact et sources relues
- **GIVEN** une policy reconcile-reviewed-terminal et un terminal shell completed non tronqué avec exit entier et revue propriétaire concordante
- **WHEN** la frontière native et les sources sont stables
- **THEN** seule la coordination devient COMPLETED et la réponse exécutable locale est invalidée sans rejeu natif

#### Scenario: Preuve manquante ou effet hors revue
- **GIVEN** une once, un accès, une autre commande à effet, un doublon ou une source divergente
- **WHEN** la clôture est demandée
- **THEN** les protections restent intactes et aucun résultat historique n’est fabriqué

### Requirement: Reprendre les reçus des frontières de validation sans effets natifs
Le système SHALL persister l’intention et l’observation avant toute mutation de
contexte ou registre. La relecture du même actionId SHALL réconcilier les
seules écritures techniques manquantes après crash sans nouvelle commande,
décision ou permission ; une identité réutilisée avec un contenu différent
SHALL être refusée.

#### Scenario: Réponse perdue ou interruption entre écritures
- **GIVEN** un reçu préparé correspondant à la frontière et à la preuve enregistrée
- **WHEN** son propriétaire relit le même actionId après interruption
- **THEN** le résultat est retrouvé ou la reprise technique exacte est proposée sans exécution native
