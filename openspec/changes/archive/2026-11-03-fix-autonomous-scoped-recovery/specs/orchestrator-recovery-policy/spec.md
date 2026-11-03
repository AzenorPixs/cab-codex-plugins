## MODIFIED Requirements

### Requirement: Aperçu de récupération typé et local au RUN

CAB MUST exposer incidents, ressources, actions et preuves manquantes par RUN. Le décideur dans le périmètre validé MUST être l’orchestrateur, y compris quand une politique manque ou qu’une preuve exige un diagnostic. Une demande humaine MUST désigner une extension hors périmètre. L’aperçu MUST conserver les protections et montrer les continuations compatibles, sans libération par délai.

#### Scenario: Opération incertaine et travail disjoint
- **WHEN** une opération protège une ressource et un travail indépendant reste possible
- **THEN** l’aperçu conserve la protection, identifie sa portée et propose la progression compatible

#### Scenario: Preuve technique insuffisante dans le mandat
- **WHEN** le RUN manque d’un reçu natif et une investigation reste dans son périmètre
- **THEN** CAB propose le diagnostic à l’orchestrateur et ne classe pas cette seule absence comme décision humaine

## ADDED Requirements

### Requirement: Annulation revue d’une validation non consommée

Une politique MAY autoriser le propriétaire à annuler sa validation PREPARED approuvée, sans native, accès ni once consommée, après revue de lecture liée au digest de commande et aux sources. CAB MUST vérifier annulation native exacte, refus audités des calls concernés et double observation stable. Il MUST conserver approved, tracer l’autorité de revue et l’exécution historique indéterminée, retirer la réponse exécutable et MUST NOT fabriquer un exit ou NO_EFFECT natif.

#### Scenario: Deux refus programmatiques d’une sonde de lecture
- **WHEN** le propriétaire fournit une revue exacte, les références des deux refus HTTP204 et que les observations confirment la frontière non consommée et l’annulation native
- **THEN** la validation CAB devient CANCELLED avec reçu de revue, sans nouvelle permission ni conclusion sur l’exécution historique

#### Scenario: Opération exécutée ou revue divergente
- **WHEN** une once est consommée, un accès existe, un autre outil intervient ou les identités/digests divergent
- **THEN** CAB refuse l’annulation revue et préserve l’effet protégé

### Requirement: Diagnostic natif sans effet par opération

CAB MUST proposer un diagnostic authentifié, borné et filtré de la seule opération du RUN. Il MUST distinguer transcript, outils concernés, permissions pendantes, reçus de refus et couverture du journal. Un watermark synchronisé sans événements concernés MUST NOT prouver une absence d’exécution. Le diagnostic MUST NOT décider, exécuter, relancer once ou exposer commandes, tokens ou secrets.

#### Scenario: Journal vide avec watermark
- **WHEN** le journal est synchronisé mais ne couvre pas les calls concernés
- **THEN** le diagnostic indique cette lacune et ses prochaines vérifications, sans NO_EFFECT

### Requirement: Réconciliation bornée d’un port local quarantiné

Une politique MAY réconcilier un port quarantiné après revue bornée et deux sondes natives distinctes exit0. CAB MUST vérifier commande, nonce, instance, namespaces, port libre et processus absents ; toute lacune MUST refuser la mutation. Seuls l’opération et son accès ciblés MUST être clôturés en RECONCILED, once conservée. L’issue historique MUST rester non observée, sans exit ou NO_EFFECT inventé.

#### Scenario: Processus disparu et port quiescent
- **WHEN** deux sondes indépendantes du compte natif prouvent la quiescence après revue du serveur Vite et de son scope
- **THEN** l’accès ciblé est RECONCILED, l’ancienne once reste acquittée et aucun exit historique ou NO_EFFECT n’est inventé

#### Scenario: Processus actif ou namespace inaccessible
- **WHEN** une sonde voit un listener, un processus candidat, une couverture incomplète ou une identité divergente
- **THEN** CAB conserve la quarantaine et propose à l’orchestrateur un diagnostic ou une ressource disjointe

### Requirement: Projection de transport relue sans admission implicite

Une revue MAY couvrir le code exact d’un wrapper de validation. CAB MUST vérifier son digest, le retour natif non modifié et une liste fermée d’appels de transport. Une request_validation NOT_ADMITTED ne peut être écartée qu’avec identité concordante et absence d’admission locale ; un appel exécutant un outil ou attribuant une décision MUST rester refusé. La projection MUST être auditée comme revue de l’orchestrateur, pas comme nouvelle preuve serveur.

#### Scenario: Nouvelle demande refusée avant annulation de l’ancienne
- **WHEN** un wrapper NOT_ADMITTED non enregistré localement sépare deux refus audités de l’annulation native exacte
- **THEN** sa projection relue n’empêche pas l’annulation locale de l’ancienne validation non consommée et ne crée aucune nouvelle demande autorisée
