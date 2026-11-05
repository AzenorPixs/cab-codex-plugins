# Mesures de coordination — delta 1.3.0

## ADDED Requirements

### Requirement: Attentes et protections distinguées
Les statistiques MUST distinguer attente de ressource, détention, exécution native observée, promotion exclusive vers partagée, réconciliation ciblée et gel exceptionnel par cause. Les chevauchements MUST rester explicites sans somme causale inventée. Une durée absente MUST rester inconnue ou N/A motivé.

#### Scenario: Attente et travail simultanés
- **WHEN** A attend une ressource pendant que B et C exécutent des opérations
- **THEN** les temps restent attribués à leurs RUN et ne deviennent pas une exclusion globale

### Requirement: Traçabilité sans chemins d'opérations
La télémétrie des conflits MUST conserver seulement les identités opaques et métadonnées autorisées. Elle MUST NOT conserver chemins d'opérations, manifests bruts, commandes, corps, sorties ou secrets. La vue locale opérationnelle des protections MUST rester distincte de l'export statistique.

#### Scenario: Manifeste contenant un chemin
- **WHEN** une acquisition est observée par le collecteur
- **THEN** ses métriques sont comptées sans copier le manifeste ou le chemin dans les statistiques

### Requirement: Comparaison de concurrence étayée
Un bilan 1.3.0 MUST distinguer réservations, accès compatibles et exécutions natives réellement observées. Il MUST exposer bornes et couverture avant toute comparaison avec une période antérieure. Les fenêtres et imports statistiques effectivement livrés MUST être conservés sans addition des sources recouvrantes.

#### Scenario: Benchmark synthétique
- **WHEN** un test démontre des accès indépendants concurrents
- **THEN** le bilan décrit cette preuve technique sans annoncer un gain causal de productivité en production

