## ADDED Requirements

### Requirement: Reprise bornée du commit non émis
CAB MUST inspecter et reprendre administrativement le même reçu PARTIAL dont le commit a échoué avant les références. Le CAS MUST lier RUN/SID/génération/acteur, état autorisé, projet, source, politique, HEAD/index/réservations et version. L’échec et son reçu MUST rester conservés ; seule une nouvelle tentative corrélée du commit MAY être admise. Version et projection MUST NOT être rejouées.

#### Scenario: Même livraison après conflit de version
- **WHEN** le commit est FAILED avant références et toutes les étapes aval restent non émises
- **THEN** CAB admet une nouvelle tentative corrélée après inspection et CAS exacts sans recréer une livraison

#### Scenario: État fermé, incertain ou protégé
- **WHEN** le RUN est CLOSED, BLOCKED ou FINALIZING, ou un effet est UNKNOWN, un bail ou une opération reste actif
- **THEN** CAB refuse la reprise et conserve tous les reçus et protections

#### Scenario: Réponse perdue ou appels concurrents
- **WHEN** la même demande est répétée après perte de réponse ou présentée simultanément
- **THEN** CAB retourne le même reçu sans déclencher une seconde tentative et refuse toute entrée différente sous le même identifiant

### Requirement: Résolution explicite et limitée des conflits
CAB MAY résoudre automatiquement un scalaire de version déclaré égal à la cible si tout autre contenu et le mode sont identiques à HEAD. Un conflit de code MUST rester refusé sauf résolution manuelle portant chemin réservé, OID/modes et diff exacts approuvés par propriétaire et responsable. Le CAS MUST lier les références de revue ; CAB MUST NOT effectuer un choix ours implicite.

#### Scenario: Métadonnée de version seule
- **WHEN** seul le scalaire de version change vers la version déjà admise
- **THEN** CAB applique ce scalaire au seul candidat en conservant tout le reste de HEAD

#### Scenario: Résolution manuelle revue
- **WHEN** les références et empreintes exactes des blobs et du diff ont été approuvées
- **THEN** CAB applique uniquement ces résolutions nommées dans l’index candidat et refuse tout chemin ou blob divergent

### Requirement: Contexte revérifié avant l’effet de reprise
Le worker MUST reprendre le même verrou Git, réobserver le CAS admis et normaliser seulement ses propres transitions corrélées avant prepare ou commit. Une divergence de HEAD, source, version ou périmètre MUST refuser l’effet. La continuation MUST exécuter seulement les étapes aval jamais émises et conserver le parcours normal sans double dispatch.

#### Scenario: Contexte changé après admission
- **WHEN** HEAD, source ou version locale change entre admission et worker
- **THEN** aucun commit, mutation de version ou projection n’est exécuté et CAB expose le refus

#### Scenario: Continuation et parcours normal
- **WHEN** le commit unique est confirmé
- **THEN** forges, build, vérification et clôture sont poursuivis une seule fois dans le même reçu
