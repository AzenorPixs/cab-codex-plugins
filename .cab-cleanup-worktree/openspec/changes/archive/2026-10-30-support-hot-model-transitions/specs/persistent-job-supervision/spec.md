## ADDED Requirements

### Requirement: Transition durable du modèle dans le même job
CAB MUST proposer prepare, commit et cancel pour un choix de modèle sous PAUSE et frontière sûre. Il MUST conserver RUN, job, session, réservations, jalons, écritures connues et ancien choix ou absence historique. L’armement ordinaire MUST rester immuable. Les versions divergentes, demandes, permissions ou effets non réconciliés MUST empêcher la transition. L’historique MUST rester non secret et atomiquement persisté avec le choix adopté.

#### Scenario: Job historique sans choix négocié
- **WHEN** son propriétaire autorise une transition avec prévol qualifié
- **THEN** le même job adopte le nouveau choix et conserve null comme ancien choix, sans historique inventé ni réarmement

#### Scenario: Job durable réorienté
- **WHEN** une transition explicite ou PLLM est qualifiée
- **THEN** la session et le job restent identiques et l’ancien choix est conservé dans l’historique avant adoption du nouveau

### Requirement: Reprise après interruption de transition
Une transition en cours MUST bloquer la supervision et les nouveaux mandats métier. Avant effet natif, elle MUST persister sa phase. Après un effet incertain ou une persistance échouée, elle MUST rester non terminale et permettre une observation/réconciliation sans rejeu aveugle. Cancel MUST être refusé après possibilité d’effet. Aucune transition MUST lever automatiquement PAUSE ou rejouer une once.

#### Scenario: Effet natif puis interruption
- **WHEN** la session peut avoir changé de modèle avant confirmation durable
- **THEN** la reprise relit le choix natif et conserve la frontière jusqu’à cohérence prouvée

#### Scenario: Annulation préparée sans effet
- **WHEN** le propriétaire annule avant toute mutation native
- **THEN** CAB conserve le choix précédent et l’événement d’annulation sans réarmement

### Requirement: Connexion fournisseur corrélée à la transition
La préparation MUST conserver la référence opaque de la connexion native lorsqu’elle existe et l’identité serveur. Commit et réconciliation MUST vérifier que cette connexion n’a pas changé autour du prévol et de l’application. Aucune valeur secrète MUST être enregistrée. Une préparation sans effet MAY être annulée après divergence fournisseur sans prétendre restaurer le compte précédent.

#### Scenario: Compte remplacé pendant préparation
- **WHEN** la connexion opaque change avant commit
- **THEN** le changement de modèle est refusé sans effet et la préparation peut être annulée sous frontière sûre
