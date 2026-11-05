## ADDED Requirements

### Requirement: Retrait isolé d’un shell refusé attaché
Le contrôleur SHALL permettre au propriétaire de retirer une coordination shell PREPARED/APPROVED sans native/nativeResult/once, après rejet natif avorté executed=false avec reçu privé reject ACKNOWLEDGED HTTP204 exactement lié au SID, processus, version, call, permission et commande approuvée. Deux frontières identiques SHALL vérifier SID idle, zéro permission, opération et accès inchangés. Le retrait SHALL conserver APPROVED et les liens historiques, sans créer un résultat natif ou NO_EFFECT.

#### Scenario: Sous-opération sur parent protégé
- **GIVEN** un unique accès parent HELD du même RUN, contexte, version et SID, contenant la sous-opération et une autre opération historique
- **WHEN** le propriétaire retire le shell refusé à la frontière qualifiée
- **THEN** seule la coordination ciblée devient CANCELLED et sa réponse exécutable locale est invalidée
- **AND** le parent, ses token/fencing, autres opérations, révisions et baux restent strictement identiques
- **AND** un nouveau mandat peut suivre le cycle ordinaire sans réutiliser les anciens identifiants ou once

#### Scenario: Preuve ou parent non admissible
- **GIVEN** un reçu absent, une commande divergente, un effet supplémentaire, une once, un résultat, un parent absent/multiple/étranger/non HELD ou une frontière modifiée
- **WHEN** le retrait est demandé
- **THEN** il est refusé sans libérer ni réconcilier le parent

#### Scenario: Réponse perdue et permission tardive
- **GIVEN** un retrait qualifié durable et une réponse perdue ou un redémarrage
- **WHEN** la même action est relue ou répétée
- **THEN** le même reçu est restauré sans effet ni modification du parent
- **AND** toute permission tardive pour l’opération annulée reste refusée

## MODIFIED Requirements

### Requirement: Retirer une coordination approuvée jamais émise
Le système SHALL permettre au propriétaire de retirer une validation PREPARED
approved non consommée, sans native, résultat ou accès, lorsque deux lectures
stables prouvent la session idle, zéro permission et aucun appel à effet
postérieur à la demande native exacte. L’action SHALL conserver approved
historique et qualifier seulement COORDINATION_WITHDRAWN_BEFORE_ISSUANCE,
sans preuve NO_EFFECT, nativeResult ou once fabriquée.

#### Scenario: Serveur préparé remplacé avant lancement
- **GIVEN** une policy withdraw-unissued-validation propriétaire et aucune émission native ou accès observés
- **WHEN** les identités, versions, frontières et lectures stables sont vérifiées
- **THEN** seule la coordination devient CANCELLED et l’ancienne réponse locale est retirée sans annulation native ou rejeu

La voie générique reste sans accès ; l’exception de retrait isolé d’un shell
refusé attaché est définie séparément et ne libère jamais son parent.

#### Scenario: Effet ou permission déjà présent
- **GIVEN** un appel à effet, une permission, une once, un accès ou une frontière divergente
- **WHEN** le retrait est demandé
- **THEN** il est refusé et les protections sont conservées
