## Purpose

Cette capacité expose la santé réelle de CAB et limite les remédiations automatiques aux cas techniques déterministes.

## ADDED Requirements

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
