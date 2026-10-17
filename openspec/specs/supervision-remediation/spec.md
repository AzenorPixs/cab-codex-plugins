# supervision-remediation Specification

## Purpose
Cette capacité expose la santé réelle de CAB et limite les remédiations automatiques aux cas techniques déterministes.

## Requirements

### Requirement: Readiness synthétique
CAB SHALL publier l'un des états READY, DEGRADED, BLOCKED ou HUMAN_REQUIRED avec une cause racine et une action recommandée. Un processus vivant ou une connexion réseau seule SHALL être insuffisant pour déclarer READY.

#### Scenario: Blocage sans reprise sûre
- **WHEN** le broker détecte une cause bloquante sans récupération automatique admissible
- **THEN** `broker_readiness` retourne BLOCKED

### Requirement: Supervision indépendante d'OpenCode
Le contrôleur SHALL surveiller OpenCode via son SSE HTTP direct et SHALL réconcilier son état par HTTP après une reconnexion ou une divergence détectée.

#### Scenario: Reconnexion SSE
- **WHEN** le flux SSE OpenCode est fermé
- **THEN** le contrôleur passe en reconnexion et tente une réconciliation avant de rétablir le flux

### Requirement: Remédiation à privilèges minimaux
Les remédiations automatiques SHALL être désactivées par défaut, soumises à une allowlist explicite et limitées aux actions déterministes. Toute remédiation ambiguë SHALL exiger une intervention humaine.

#### Scenario: Auto-remédiation non autorisée
- **WHEN** aucune allowlist active n'autorise une action de remédiation
- **THEN** CAB n'exécute pas cette action automatiquement

### Requirement: Supervision des relances de décision
CAB SHALL exposer l'état de la dernière relance corrélée et d'une éventuelle
notification locale persistante sans considérer une relance comme une
progression métier. Une relance ou son échec SHALL NOT déclencher de décision,
de permission OpenCode ou de remédiation automatique hors de son périmètre
technique.

#### Scenario: Relance en attente d'examen
- **WHEN** une relance corrélée est conservée pour l'orchestrateur
- **THEN** la supervision la rend observable sans déclarer le mandat décidé

### Requirement: Supervision durable des jobs non terminaux

CAB SHALL superviser durablement un job armé indépendamment du cycle de vie
d'un tour conversationnel. Il SHALL distinguer une panne ou indisponibilité
technique d'un état métier terminal, réconcilier les états observables après
une reconnexion SSE et ne relancer la session que selon le contrat de job. Une
relance SHALL rester une action technique sans effet sur une approbation ou une
décision CAB.

#### Scenario: Fermeture SSE pendant un job armé

- **WHEN** le flux SSE se ferme alors qu'un job armé conserve un gate ouvert
- **THEN** CAB réconcilie l'état par HTTP, conserve le job non terminal et ne
  le déclare ni terminé ni bloqué sans gate valide

### Requirement: Readiness commune et par RUN
Le broker MUST publier les compteurs par RUN et session ainsi que la santé commune et le protocole de coordination. Une attente métier ou de ressource MUST rester distincte d'une défaillance commune. Une remédiation de l'infrastructure partagée MUST suivre le gel exceptionnel et la réconciliation des RUN affectés.

#### Scenario: Isolation concurrente
- **WHEN** A attend une ressource et B est sain sur un périmètre indépendant
- **THEN** B conserve sa disponibilité propre sans masquer une défaillance commune

### Requirement: Cause actuelle de coordination observable
Les vues de statut MUST distinguer conflit de ressource, révisions affectées, promotion de périmètre, pause/arrêt ciblés, gel global exceptionnel et incertitude. Elles MUST exposer propriétaire bloquant, portée autorisée et date d'observation sans contenu sensible. Un statut périmé MUST NOT devenir une cause actuelle affirmée.

#### Scenario: Conflit résolu
- **WHEN** une protection est libérée mais un checkpoint conserve l'ancienne attente
- **THEN** la vue actuelle ne présente plus ce propriétaire comme obstacle sans preuve de conflit restant

### Requirement: Diagnostic sans remédiation implicite
Le healthcheck et les lectures de statut MUST rester sans permission, acquisition métier ni remédiation. Une longue attente de ressource MUST NOT déclencher reconnexion, purge, redémarrage, gel général ou libération. Une défaillance commune MUST rester visible sans décision implicite.

#### Scenario: Attente longue
- **WHEN** une demande reste bloquée par une opération longue connue
- **THEN** le diagnostic expose la cause sans libérer les ressources ni redémarrer les services
