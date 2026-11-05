## MODIFIED Requirements

### Requirement: Récupération globale explicite d’un reçu MCP avec broker failed
Dans un cycle CABU autorisé, CAB MAY récupérer pending persistant ou failed sous l’accord permanent explicite et révocable du développeur, sans nouvelle question par reçu. Le flag MUST cibler le reçu non terminal exact. CAB MUST vérifier snapshot inactive sans permission partagée, intention unique, identités, versions et readiness. Sans flag ou si une garde échoue, aucun POST. Aucun autre profil ni effet métier n’est autorisé.

#### Scenario: Broker failed avec reçu exact et locations inactives
- **WHEN** le reçu est autorisé, OpenCode conserve sa même identité et la
  snapshot montre zéro session active et zéro permission partagée
- **THEN** l’updater persiste l’intention, envoie un POST global unique,
  vérifie PID/version/location/sessions et clôt le même reçu seulement après
  confirmation du broker cible et de sa readiness

#### Scenario: Accord permanent et reçu admissible
- **GIVEN** un cycle CABU autorisé et l’accord permanent explicite non révoqué
- **WHEN** le reçu est admissible et les contrôles frais de la frontière sont satisfaits
- **THEN** l’orchestrateur fournit le flag du reçu exact sans redemander un accord unitaire
- **AND** les snapshots, l’intention unique, les contrôles de continuité et les limites métier restent obligatoires

#### Scenario: Coordination des locations et formulaires
- **WHEN** une autre location ou un formulaire connu exige une décision non couverte
- **THEN** le pilote conserve le reçu et ne suppose pas que la reconstruction globale peut l’annuler

#### Scenario: Accord révoqué ou cas hors cadre
- **WHEN** l’accord permanent est révoqué ou le cas exige un autre profil ou une décision hors de son cadre
- **THEN** l’orchestrateur conserve le reçu et les protections et demande seulement l’autorisation manquante

#### Scenario: Broker failed sans autorisation exacte
- **WHEN** `--recover-mcp` manque, vise un autre reçu ou le reçu est terminal
- **THEN** l’updater refuse avant le POST global et conserve le reçu courant

#### Scenario: Session active, permission ou identité divergente
- **WHEN** une session est active, une permission partagée existe, la snapshot
  est invalide ou l’identité OpenCode diverge
- **THEN** l’updater refuse sans POST, arrêt ou redémarrage OpenCode

#### Scenario: Résultat inconnu après l’intention
- **WHEN** l’intention globale existe déjà, la réponse est perdue ou le broker
  reste failed après le reload
- **THEN** l’updater conserve le même reçu non terminal et ne rejoue pas le POST
