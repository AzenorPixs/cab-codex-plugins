## ADDED Requirements

### Requirement: Migration 2.4 et services associés
CABU SHALL installer/vérifier les services SGS/CCAB et collecteurs, préparer à chaud et adopter les reçus existants compatibles. La bascule SHALL conserver identités/décisions/onces/communications sans rejeu et vérifier les versions chargées avant succès. Les métriques SHALL distinguer préparation/bascule/indisponibilité/récupération/vérification.

#### Scenario: Cleanup SEALED ancien en environnement multi-compte
- **WHEN** la version2.4 remplace2.3.10 avec une transaction encore SEALED avant effacement
- **THEN** elle conserve le même transactionId/scope et permet reprise via exécution sous chaque propriétaire système
