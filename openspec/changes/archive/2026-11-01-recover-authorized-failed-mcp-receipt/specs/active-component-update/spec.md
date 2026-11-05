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

### Requirement: Clôture explicite d’un reçu dépassé
CAB MUST clore en `SUPERSEDED` un reçu `MCP_RECOVERY_REQUIRED` en reprise
`RESTARTING` uniquement après récupération MCP vérifiée et autorisée sur son
identifiant exact. CAB MUST conserver l’historique du reçu et MUST NOT démarrer
d’installation dans cette invocation.

#### Scenario: Récupération autorisée du reçu historique
- **WHEN** le reçu exact est autorisé, le reload global est déjà vérifié, les
  sessions et permissions partagées sont absentes et les preuves d’artefacts
  et de readiness satisfont leurs exigences
- **THEN** l’updater consigne la supersession dans le même reçu et retourne
  `SUPERSEDED`, sans rejouer le reload ni arrêter un service

### Requirement: Preuve d’artefacts et versions avant supersession
CAB MUST vérifier que chaque artefact hors broker correspond à l’empreinte du
reçu. Les trois artefacts broker MUST correspondre octet pour octet au paquet
CAB courant, plus récent que le reçu. La readiness fraîche MUST confirmer les
versions des services du reçu et un broker supérieur au reçu, au plus égal à
la version du paquet courant.

#### Scenario: Seul le broker a avancé vers le paquet CAB courant
- **WHEN** les artefacts hors broker correspondent au reçu et les trois
  artefacts broker correspondent au paquet courant plus récent
- **THEN** l’updater accepte la preuve de supersession si les versions actives
  et la readiness respectent l’intervalle défini

#### Scenario: Un artefact hors broker ou une version diverge
- **WHEN** un autre artefact diffère, un fichier broker ne correspond pas au
  paquet courant ou la readiness/version active ne satisfait pas les bornes
- **THEN** l’updater garde le reçu non terminal et refuse `SUPERSEDED`

### Requirement: Nouvelle transaction après supersession
CAB MUST utiliser un nouvel identifiant pour l’installation complète qui suit
un reçu `SUPERSEDED` et MUST conserver ce reçu historique sans le réécrire.

#### Scenario: Reprise du reçu superseded
- **WHEN** un appel CABU ultérieur rencontre le reçu terminal `SUPERSEDED`
- **THEN** il ouvre une nouvelle transaction avec un nouvel identifiant et
  installe le jeu complet courant ; il ne relance pas le reload global du reçu
