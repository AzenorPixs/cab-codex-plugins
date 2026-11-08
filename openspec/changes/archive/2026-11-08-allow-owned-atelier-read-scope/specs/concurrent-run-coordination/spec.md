## MODIFIED Requirements

### Requirement: Extension additive de ressources compatibles

Le propriétaire MAY ajouter des ressources disjointes dans les namespace et droits réservés, ainsi que la lecture d’un chemin canonique de son atelier change/RUN. CAB MUST vérifier owner, génération, digest et recouvrements protégés. L’extension MUST être additive et idempotente, conserver générations, jetons, fencing et opérations. Les nouvelles opérations MUST garder leurs mandats et once.

#### Scenario: Port quarantiné et port de remplacement
- **WHEN** l’orchestrateur ajoute un port disjoint pour le même objectif de test
- **THEN** le manifeste grandit, l’ancien port reste protégé et les générations et jetons détenus ne changent pas

#### Scenario: Frontière périmée ou périmètre recouvrant
- **WHEN** le digest a changé, le propriétaire diverge ou l’ajout recouvre une ressource protégée
- **THEN** l’extension est refusée sans mutation du manifeste ni des protections

#### Scenario: Lecture de l’atelier du RUN
- **WHEN** l’ajout en lecture est un chemin canonique dans `.cab-tests/<change>/<RUN>/` du RUN propriétaire
- **THEN** l’extension peut être acceptée sous les autres gardes et l’écriture projet exige toujours sa validation distincte

#### Scenario: Atelier étranger ou écriture dans l’atelier
- **WHEN** l’ajout vise un autre atelier ou demande une écriture hors namespace déjà réservé
- **THEN** l’exception de lecture ne l’autorise pas
