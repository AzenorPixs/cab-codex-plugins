## ADDED Requirements

### Requirement: Récupération globale explicite d’un reçu MCP avec broker failed
Pour un reçu non terminal exact en `MCP_RECOVERY_REQUIRED`, CAB MAY traiter
`failed` par `--recover-mcp` uniquement après accord explicite lié à ce reçu.
CAB MUST vérifier une snapshot globale inactive, sans permission partagée,
écrire l’intention avant l’unique POST global et contrôler identité, versions
et readiness fraîche. Sans flag exact ou si une garde échoue, aucun POST.

#### Scenario: Broker failed avec reçu exact et locations inactives
- **WHEN** le reçu est autorisé, OpenCode conserve sa même identité et la
  snapshot montre zéro session active et zéro permission partagée
- **THEN** l’updater persiste l’intention, envoie un POST global unique,
  vérifie PID/version/location/sessions et clôt le même reçu seulement après
  confirmation du broker cible et de sa readiness

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
