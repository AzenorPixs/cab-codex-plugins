## ADDED Requirements

### Requirement: Extension additive de ressources compatibles

Le propriétaire MAY ajouter des ressources disjointes dans les namespace et droits réservés malgré des effets protégés. CAB MUST vérifier owner, génération, digest du manifeste et recouvrement avec accès, attentes et effets inconnus. L’extension MUST être additive et idempotente, conserver générations, jetons, fencing et opérations. Les nouvelles opérations MUST garder leurs propres mandats et once.

#### Scenario: Port quarantiné et port de remplacement
- **WHEN** l’orchestrateur ajoute un port disjoint pour le même objectif de test
- **THEN** le manifeste grandit, l’ancien port reste protégé et les générations/jetons détenus ne changent pas

#### Scenario: Frontière périmée ou périmètre recouvrant
- **WHEN** le digest a changé, le propriétaire diverge ou l’ajout recouvre une ressource protégée
- **THEN** l’extension est refusée sans mutation du manifeste ni des protections
