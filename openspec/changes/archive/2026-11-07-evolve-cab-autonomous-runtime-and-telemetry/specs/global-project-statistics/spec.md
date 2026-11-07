## MODIFIED Requirements

### Requirement: Brique Statistiques du Web Monitor
Le Web Monitor MUST afficher la version et l’état du service SGS réellement chargé, par une requête IPC bornée sans génération de rapport. Une source indisponible ou divergente MUST être distincte de READY. La CLI de rapports MUST rester utilisable sans service permanent. La carte MUST NOT lancer une reconstruction statistique ni exposer chemins privés, secrets ou sorties brutes.

#### Scenario: Service SGS disponible
- **WHEN** SGS répond READY avec sa version chargée
- **THEN** la carte affiche cette version sans lancer de rapport ou de reconstruction

#### Scenario: Moteur cohérent disponible
- **WHEN** le service SGS et le moniteur ont une version cohérente et le service est READY
- **THEN** la carte présente Disponible et sa version chargée sans génération de rapport

#### Scenario: Paquet incomplet ou version différente
- **WHEN** le service ne répond pas ou sa version diffère de celle attendue
- **THEN** la carte indique Indisponible ou Version divergente sans bloquer les autres vues

## ADDED Requirements

### Requirement: SGS permanent et autonome
SGS SHALL fonctionner comme service permanent, collecter les sources natives Codex/OpenCode pour les codeurs et orchestrateurs directs/pilotés et recevoir directement les statistiques des briques. Les LLM SHALL compléter uniquement les faits non natifs. Les événements SHALL porter provenance, namespace instance et curseur de déduplication. Une source indisponible SHALL être N/A motivée. Une indisponibilité SGS SHALL ne pas bloquer le codage ; une outbox durable SHALL permettre reprise.

#### Scenario: Changement de modèle et reprise de collecte
- **WHEN** modèle/fournisseur/raisonnement change ou le collecteur redémarre
- **THEN** SGS conserve les périodes horodatées et reprend sans doublon ni perte des compteurs acquittés

#### Scenario: Historique après nettoyage
- **WHEN** les buffers d’un RUN clos sont supprimés
- **THEN** les rapports STATISTICS.md durables permettent la restitution SGS sans conserver le runtime du RUN
