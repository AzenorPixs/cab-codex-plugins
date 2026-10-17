## ADDED Requirements

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
