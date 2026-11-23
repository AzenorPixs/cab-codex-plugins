## MODIFIED Requirements

### Requirement: Propriétaire durable et génération
CAB MUST conserver les preuves et les protections des effets après interruption. Le bail expiré du protocole PostgreSQL MUST être retiré de la table courante à son échéance. Chaque évolution MUST contrôler la génération attendue. Un jeton libéré ou une ancienne génération MUST NOT autoriser une permission. Un délai seul MUST NOT libérer ni transférer une protection.

#### Scenario: Reprise après crash
- **WHEN** le contrôleur redémarre avec une réservation et une acquisition persistées
- **THEN** il conserve leurs preuves, réévalue leurs échéances et exige une réconciliation avant toute nouvelle permission

### Requirement: Restitution vérifiée des environnements
CAB MUST protéger l’environnement jusqu’à la fin des opérations et au nettoyage vérifié. Un bail PostgreSQL expiré MUST cesser d’autoriser l’usage. Le nettoyage et sa vérification MUST être distincts, corrélés et réussis. Un banc PostgreSQL jamais utilisé MAY être restitué sans mutation, explicitement ou à échéance. Une fin de commande ou un booléen seul MUST NOT suffire. Une demande répétée MUST rendre le même reçu ou être refusée si elle diverge.

#### Scenario: Test fini et nettoyage incomplet
- **WHEN** la dernière commande de test termine mais le nettoyage est absent ou échoué
- **THEN** la ressource reste protégée et aucun pair ne peut l'utiliser

#### Scenario: Test échoué et environnement restitué
- **WHEN** un test échoue puis le nettoyage et la vérification de disponibilité réussissent sans autre opération restante
- **THEN** la réservation peut être libérée sans transformer le résultat du test en succès

### Requirement: Reprise et clôture protégées des tests
Après interruption, CAB MUST conserver les preuves et protections, et retirer les baux PostgreSQL expirés. Un lecteur compatible MUST réconcilier la frontière native avant nouvel usage, renouveler les jetons et refuser les anciennes générations. Une réservation non résolue MUST empêcher la publication, la réduction de périmètre et la clôture réussie. Seule une attente sans effet MAY être annulée.

#### Scenario: Redémarrage pendant un test
- **WHEN** le contrôleur redémarre avant restitution vérifiée
- **THEN** la ressource reste protégée et aucune nouvelle permission ne peut utiliser l'ancien jeton

#### Scenario: Gate prématuré
- **WHEN** les accès de fichiers sont libérés mais l'environnement de test reste détenu
- **THEN** le gate terminal normal et la livraison sont refusés

#### Scenario: Réacquisition idempotente d'un bail restauré
- **WHEN** le propriétaire répète le POST `acquire` avec le même RUN, `transactionId`, version, ressources, evidence et payload après redémarrage
- **THEN** CAB renvoie le bail HELD existant au demandeur POST avec le même token/fencing et `reconciliationRequired=true`, sans créer de bail ni permission ; les projections GET omettent toujours le token

#### Scenario: Payload de réacquisition divergent
- **WHEN** un champ du payload POST diffère pour un `transactionId` déjà détenu
- **THEN** CAB refuse la transaction sans changer le bail, le token ou le fencing

#### Scenario: Réconciliation conserve le bail
- **WHEN** le propriétaire transmet le token/fencing retournés par la réacquisition exacte à `/test-resources/reconcile`, avec `reconciliationId` neuf et les contrôles natifs réussis
- **THEN** CAB renouvelle token/fencing, conserve la réservation HELD et retire `reconciliationRequired` ; aucune ressource n'est libérée ni commandée
