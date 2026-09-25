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
