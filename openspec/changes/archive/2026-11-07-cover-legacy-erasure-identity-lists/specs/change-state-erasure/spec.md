## ADDED Requirements

### Requirement: Listes historiques typées conservatrices
La projection SHALL reconnaître inventory.onceAcknowledged de migration et restoredAccesses de continuité comme listes d’identifiants. Elle SHALL retirer seulement les chaînes exactement ciblées, préserver les pairs et leur ordre, et SHALL NOT altérer les booléens onceAcknowledged des opérations. Les contrôles de digest et réancrages existants SHALL rester appliqués.

#### Scenario: Inventaire de once et transfert historique
- **WHEN** un reçu historique contient des identifiants du change clos et de pairs
- **THEN** seuls ceux du change sont retirés, les booléens et identifiants des pairs restent intacts

### Requirement: Récupération de préparation sans rollback
recover-preparation SHALL exiger le même reçu signé STOPPING sans entries ni expectedPeers, des RUN clos et liaisons identiques, et NativePID/SID/permissions vérifiés. Il SHALL vérifier services et broker à la version déclarée puis recapturer leurs PID sans changer scope ou phase. Il SHALL NOT déclarer une projection réalisée ou restaurer les fichiers déjà APPLIED.

#### Scenario: Nouveaux PID après arrêt avant projection
- **WHEN** les services ont été rétablis mais le même reçu STOPPING conserve leurs anciens PID
- **THEN** la récupération vérifie les identités réelles et recapture les PID pour la reprise du même effacement

#### Scenario: Application déjà engagée
- **WHEN** le reçu porte entries ou expectedPeers, une phase après STOPPING ou des liaisons divergentes
- **THEN** recover-preparation est refusé sans rollback, changement de scope ou nouvelle transaction

## MODIFIED Requirements

### Requirement: Compatibilité de reprise identifiée
Les helpers2.4.1/2.4.2 MAY reprendre une transaction v1 existante avec runtime2.4.0 explicite pour execute/finalize/verify ; le helper2.4.2 MAY aussi recover-preparation. Les quatre versions et PID SHALL être contrôlés exactement, sans version arbitraire ni nouvel effacement. Le certificat SHALL distinguer helper et runtime ; le CABU global SHALL rester distinct.

#### Scenario: Reprise avant mise à jour globale
- **WHEN** un effacement2.4.0 reste engagé et le helper compatible est qualifié
- **THEN** le même reçu peut être terminé en vérifiant les processus2.4.0, puis le CABU global peut actualiser toutes les briques
