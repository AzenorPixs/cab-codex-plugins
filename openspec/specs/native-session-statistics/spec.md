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

### Requirement: Observations complémentaires filtrées et neutres
CAB MUST accepter explicitement des jeux de métadonnées d'observation associés au projet et à une source identifiée. Le contrat MUST refuser les champs inconnus, corps de messages, commandes, arguments, chemins d'opérations, URL, sorties, secrets et identifiants bruts de compte. L'import MUST NOT modifier réservations, permissions, décisions, readiness métier ou gate.

#### Scenario: Import sensible ou projet divergent
- **WHEN** un jeu contient un champ interdit ou désigne un autre projet
- **THEN** CAB refuse l'import sans persistance ni effet métier et retourne un diagnostic sans contenu brut

### Requirement: Import durable idempotent et provenance séparée
Chaque jeu MUST posséder une identité et une empreinte déterministes. Un import identique MUST être sans double compte ; un contenu divergent sous la même identité MUST être refusé. Sources natives et importées MUST rester séparées et horodatées dans les exports ; les chevauchements MUST NOT être additionnés. La persistance MUST être privée, atomique, bornée et refuser les liens.

#### Scenario: Répétition après redémarrage
- **WHEN** le même jeu est importé après restauration
- **THEN** le reçu identifie le jeu déjà conservé et les compteurs restent identiques

#### Scenario: Persistance indisponible
- **WHEN** un stockage est invalide ou inaccessible
- **THEN** les preuves restent intactes, la limite est visible et aucun effet métier n'est autorisé ou rejoué

### Requirement: Fenêtres temporelles natives auditables
CAB MUST collecter les segments et événements filtrés nécessaires aux vues des dernières 24 heures, 7 jours et 30 jours. Les durées MUST être découpées aux bornes demandées et les événements dédupliqués par identité. Les périodes non couvertes, changements de périmètre et détails antérieurs à la collecte ou à la rétention MUST rester inconnus. Les compteurs cumulés hérités MUST NOT être présentés comme des compteurs de fenêtre.

#### Scenario: Fenêtre partiellement couverte et triple concurrence
- **WHEN** une fenêtre contient une lacune et des segments avec deux puis trois périmètres
- **THEN** les quatre catégories exposent MONO, MULTI, ZERO, INCONNU, exactement deux, au moins trois, couverture et dénominateurs sans sommer les paires recouvrantes

### Requirement: Sélection courante et dernière livraison
La vue courante MUST distinguer les contextes actifs par RUN. La vue dernière MUST sélectionner la dernière livraison observée avec une borne exploitable, sans considérer une simple lecture ou publication comme une livraison. Les états importés MUST être signalés comme historiques ; une borne absente MUST rester N/A.

#### Scenario: Publication sans clôture
- **WHEN** un contexte a publié mais reste en phase documentaire
- **THEN** il peut rester courant mais ne devient pas la dernière livraison validée

### Requirement: Migration locale du job arrêté
Un importeur distribué MUST pouvoir transformer les seuls fichiers d'audit explicitement ciblés en métadonnées filtrées. Il MUST conserver scopes, contextes, lacunes, preuves et quotas partagés comparables sans reconstruire une activité avant couverture. Il MUST NOT suivre de liens, ouvrir un chemin arbitraire issu du contenu, modifier les sources ou redémarrer le job.

#### Scenario: Historique avant extension de portée
- **WHEN** le job commence à observer de nouvelles identités après son début
- **THEN** l'import conserve la borne d'extension et ne transforme pas leur période antérieure en inactivité

### Requirement: Consultation et brouillons compatibles
Les vues JSON et Markdown MUST permettre la consultation des statistiques natives et complémentaires avec leur provenance, limites et N/A. Les anciennes interfaces MUST rester disponibles et le brouillon individuel MUST conserver six sections principales sans publication ni décision implicite.

#### Scenario: Données uniquement importées
- **WHEN** un contexte historique n'a pas de compteur natif disponible
- **THEN** la consultation présente les preuves importées et signale les métriques natives absentes sans les fabriquer

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
Un bilan 1.10.1 MUST distinguer réservations, accès compatibles et exécutions natives réellement observées. Il MUST exposer bornes et couverture avant toute comparaison avec une période antérieure. Les fenêtres et imports statistiques effectivement livrés MUST être conservés sans addition des sources recouvrantes.

#### Scenario: Benchmark synthétique
- **WHEN** un test démontre des accès indépendants concurrents
- **THEN** le bilan décrit cette preuve technique sans annoncer un gain causal de productivité en production

### Requirement: Maintenance statistique explicite
Le contrôleur MUST exposer une projection filtrée pour STATS et une maintenance propriétaire conforme à web-statistics-retention. La maintenance MUST préserver les interfaces JSON/Markdown existantes, la séparation native/importée et les contrats de permission. Les données purgées MUST devenir absentes ou inconnues, jamais une activité nulle inventée.

#### Scenario: Fenêtre après purge
- **WHEN** une fenêtre recouvre des segments supprimés
- **THEN** la couverture diminue et les périodes sans preuve restent INCONNU
