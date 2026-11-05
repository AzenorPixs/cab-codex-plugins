## MODIFIED Requirements

### Requirement: Retrait isolé d’un shell refusé attaché
Le contrôleur SHALL retirer seulement l’enfant PREPARED/APPROVED sans native/nativeResult/once, sur preuve qualifiée de rejet shell ou edit avorté executed=false et reçu privé reject ACK204 exact. Deux frontières stables SHALL vérifier SID courant idle, zéro permission et parent HELD inchangé. Un historique d’autre SID SHALL être admissible seulement CANCELLED sans native/nativeResult/once, dans le même RUN/contexte/version. APPROVED et protections SHALL rester conservés.

#### Scenario: Sous-opération sur parent protégé
- **GIVEN** un parent unique HELD du même RUN/contexte/version couvrant l’enfant courant et une autre opération historique
- **WHEN** le propriétaire retire le shell ou edit refusé à la frontière qualifiée
- **THEN** seule la coordination ciblée devient CANCELLED et sa réponse exécutable locale est invalidée
- **AND** le parent, ses token/fencing, autres opérations, révisions et baux restent strictement identiques

#### Scenario: Historique annulé après changement de session
- **GIVEN** une ancienne opération d’autre SID annulée avant émission, sans native, nativeResult ni once, dans le même accès et la même génération
- **WHEN** l’enfant courant dispose d’une preuve de rejet qualifiée
- **THEN** l’ancien SID historique ne bloque pas le retrait ciblé, sans changement de cette ancienne opération ni de l’accès
- **AND** les gardes d’émission sur accès historique restent inchangées, aucune nouvelle once ne vient du retrait

#### Scenario: Ancien SID non admissible
- **GIVEN** un enfant d’ancien SID, un historique étranger ou un historique d’autre SID non CANCELLED ou présentant native, résultat ou once
- **WHEN** le retrait est demandé
- **THEN** CAB refuse sans mutation de l’enfant ni du parent

#### Scenario: Preuve ou parent non admissible
- **GIVEN** un reçu absent, input/cible divergent du rejet qualifié, effet supplémentaire, once, résultat, parent absent/multiple/étranger/non HELD ou frontière modifiée
- **WHEN** le retrait est demandé
- **THEN** il est refusé sans libérer ni réconcilier le parent

#### Scenario: Réponse perdue et permission tardive
- **GIVEN** un retrait qualifié durable et une réponse perdue ou un redémarrage
- **WHEN** la même action est relue ou répétée
- **THEN** le même reçu est restauré sans effet ni modification du parent
- **AND** toute permission tardive pour l’opération annulée reste refusée
