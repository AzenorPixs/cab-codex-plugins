# native-session-statistics Specification

## Purpose
Agréger automatiquement les métadonnées CAB par contexte de change, mesurer
les attentes et préparer des rapports auditables sans RUN d'observation
supplémentaire, sans contenu sensible et sans décision implicite.

## Requirements

### Requirement: Collecte intégrée filtrée
CAB MUST agréger automatiquement les événements du registre, les demandes du
broker relayées, les décisions, permissions natives et métadonnées SSE sans
RUN d'observation, appel LLM ou lecture d'historique brut supplémentaire.
CAB MUST NOT conserver les corps de messages, arguments, commandes, chemins
d'opérations, URL, sorties ou secrets dans ses statistiques.

#### Scenario: Événement sensible et doublon
- **WHEN** un événement outil contenant des arguments sensibles est reçu plusieurs fois
- **THEN** seul son état et ses métadonnées autorisées sont comptés une fois sans conserver les arguments

### Requirement: Attribution et couverture auditables
Les statistiques MUST distinguer chaque contexte de change d'un RUN, les
prévols, RSMP et inventaires, les réservations, états natifs et décisions.
Une période sans source MUST rester inconnue. Les conditions simultanées
MUST NOT être additionnées comme une durée calendaire. Les quantiles MUST
indiquer leur échantillon ; busy MUST NOT prouver du codage productif.

#### Scenario: Reprise et nouveau change
- **WHEN** le contrôleur redémarre ou le même RUN réserve un autre change
- **THEN** les agrégats précédents sont conservés, la lacune reste inconnue et le nouveau contexte est distinct

### Requirement: Export déterministe sans décision
GET /statistics et GET /runs/<id>/statistics MUST exposer des agrégats privés
locaux. format=markdown MUST produire automatiquement un brouillon à six
sections sans écrire dans le projet ni approuver une opération. Les données
absentes MUST être N/A motivé. Le rapport final MUST être examiné puis publié
par un mandat unitaire explicite. Un échec de persistance MUST être visible
sans autoriser ni rejouer un effet.

#### Scenario: Statistiques indisponibles
- **WHEN** l'écriture runtime échoue ou un quota est inaccessible au service
- **THEN** l'export signale la limite et aucune décision ni mesure n'est inventée

### Requirement: Latences distinctes
CAB MUST mesurer séparément réception à décision et décision à permission
once, ainsi que les débuts/fins natifs réellement observés et les causes
d'attente de coordination. Les événements manquants MUST NOT être reconstruits.

#### Scenario: Décision sans exécution observée
- **WHEN** une décision approved existe sans fin d'outil native observée
- **THEN** elle reste une décision approuvée et ne devient pas une exécution réussie
