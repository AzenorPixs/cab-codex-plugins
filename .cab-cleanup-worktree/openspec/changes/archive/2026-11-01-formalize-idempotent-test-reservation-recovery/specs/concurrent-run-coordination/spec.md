## MODIFIED Requirements

### Requirement: Reprise et clôture protégées des tests
CAB MUST conserver les réservations après crash, pause, arrêt ou délai dépassé. Un lecteur compatible MUST exiger une réconciliation de la frontière native avant nouvel usage après restauration, renouveler les jetons sans libération et refuser les anciennes générations. La publication, réduction de périmètre et clôture réussie MUST rester interdites tant qu'une réservation est non résolue. Une annulation MUST concerner uniquement une attente sans effet.

#### Scenario: Redémarrage pendant un test
- **WHEN** le contrôleur redémarre avant restitution vérifiée
- **THEN** la réservation reste protégée et aucune nouvelle permission ne peut utiliser l'ancien jeton

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

## ADDED Requirements

### Requirement: Restitution sans effet d'un bail restauré lorsque le jeton est perdu
CAB MAY restituer un bail de test HELD restauré sans son ancien jeton uniquement par la preview dédiée puis le POST de restitution sans effet. Le parcours MUST être lié à un RUN actif dont le job armé porte le même change et la même identité. Le contrôleur MUST vérifier la frontière, l'historique natif complet et l'absence d'effet. Il MUST refuser toute incertitude, ne restituer que ce bail et ne révéler aucun jeton.

#### Scenario: Bail restauré inutilisé dans un change déjà armé
- **WHEN** le bail est HELD/restauré, le RUN et son job armé portent le même change, la preview native complète prouve zéro mutation et aucune opération ne reste active
- **THEN** le propriétaire peut restituer le bail sans ancien token ni nouvelle permission, après attestation complète ; CAB marque uniquement ce bail RELEASED et renvoie un reçu sans token

#### Scenario: Bail restauré avec activité ou preuve incertaine
- **WHEN** une permission, un mandat, un effet, une opération en cours/inconnue, une mutation, une compaction ou une divergence d'historique est observée
- **THEN** preview ou POST refuse et le bail reste HELD sans suppression de token

#### Scenario: Scope ou frontière divergente
- **WHEN** le `changeId`, propriétaire, session, contexte, répertoire, version, fencing ou digest de preview diverge du RUN courant
- **THEN** le POST est refusé sans mutation ni restitution
