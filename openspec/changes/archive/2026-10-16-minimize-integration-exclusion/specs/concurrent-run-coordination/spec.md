## ADDED Requirements

### Requirement: Fenêtre critique minimale
L'orchestrateur MUST préparer le travail avant la file et réserver l'exclusion
aux validations combinées, à la publication et au contrôle de leurs effets.
Le rapport, les relevés finaux et le gate MUST suivre sa libération prouvée.
Un effet inconnu MUST interdire toute libération automatique.

#### Scenario: Rapport après publication
- **WHEN** la publication et ses validations applicables sont prouvées
- **THEN** l'exclusion est libérée avant le rapport sans supprimer l'obligation de rapport et de gate

### Requirement: Publication et phase documentaire atomiques
CAB MUST proposer une libération publiée atomique vers REPORT avec génération,
référence attendue, preuves et cible du rapport vérifiées. La référence, le reçu,
la portée documentaire et la libération MUST être persistés ensemble.
Les routes historiques MUST rester disponibles.

#### Scenario: Publication concurrente suivante
- **WHEN** A termine la publication atomique et B peut acquérir l'exclusion
- **THEN** A est déjà limité à son rapport et ses anciennes générations sont invalides

### Requirement: Reçu de publication idempotent
Une transaction identifiée MUST restituer son reçu durable sans nouvel effet
pour un contenu identique, y compris après reprise. Un contenu divergent MUST
être refusé. Le reçu MUST rester distinct d'une décision et du gate terminal.

#### Scenario: Réponse perdue puis reprise
- **WHEN** une publication réussie est répétée avec la même transaction après redémarrage
- **THEN** son reçu est restitué sans nouvelle référence ni nouvelle permission

### Requirement: Drainage observable au prochain jalon stable
Le demandeur MUST préparer son intégration avant la file. Les pairs MUST viser
leur prochain jalon cohérent avec validations locales, sans effet inconnu.
CAB MUST exposer les obstacles par RUN sans contenu ni autorisation implicite.
La position FIFO MUST survivre aux réconciliations.

#### Scenario: Change pair inachevé mais stable
- **WHEN** un pair atteint un état cohérent validé sans mandat ni effet en attente
- **THEN** il peut déclarer ready sans attendre la fin de toutes ses tâches métier

### Requirement: Observation native regroupée et recontrôlée
Le contrôleur MUST lire les états et permissions une fois par contrôle de
cohorte, vérifier les identités natives et recontrôler les effets et révisions.
Une observation invalide, indisponible ou modifiée MUST refuser la transition.
Ces lectures MUST NOT approuver ni mettre en cache une permission.

#### Scenario: État modifié pendant les lectures
- **WHEN** un événement pertinent ou une transition rend l'observation incertaine
- **THEN** l'intégration attend une nouvelle réconciliation sans publication ni permission
