## MODIFIED Requirements

### Requirement: Disponibilité et fraîcheur explicites
Chaque source MUST publier tentative, succès et état. Hors carte Web, fraîcheur et états affichés MUST rester ceux du snapshot daté appliqué jusqu'au suivant. Une source alors inaccessible ou périmée MUST NOT paraître saine. Les commandes MUST contrôler séparément la fraîcheur courante. Transport, activité et progression MUST rester distincts. La carte Web MUST conserver son expiration de trente minutes.

#### Scenario: Vue manuelle au-delà du délai de fraîcheur
- **WHEN** une vue valide est appliquée en Manuel et le délai de fraîcheur des sources s'écoule sans nouveau snapshot appliqué
- **THEN** états observés des briques et RUN, métriques, sélection et détails restent consultables sans bascule automatique vers indisponible ou UNKNOWN ; la dernière vue reste datée et les commandes conservent leurs gardes courantes

#### Scenario: Source déjà ancienne au rafraîchissement
- **WHEN** Actualiser applique un snapshot contenant une source périmée ou inaccessible
- **THEN** la vue indique son indisponibilité ou son ancienneté sans la présenter comme saine

#### Scenario: Ancien statut nominal
- **WHEN** une source devient inaccessible après un statut READY
- **THEN** le prochain snapshot appliqué conserve l'observation comme ancienne et sa disponibilité n'est pas READY

#### Scenario: Transport perdu et récupération échouée
- **WHEN** le SSE est interrompu puis un rafraîchissement échoue ou reçoit un snapshot invalide
- **THEN** la connexion ou l'échec est signalé et les dernières observations affichées restent conservées

### Requirement: En-tête et navigation de gestion
MONITOR MUST afficher CENTRE D’OBSERVATION en grand et gras. Dernière vue et Collecte/vue MUST suivre CAB / Supervision et WORKSPACE LOCAL sur une ligne sans élargir le document. Actualisation MUST rester disponible. ARCHIVES MUST suivre MONITOR et STATS. Navigation MUST rester accessible au clavier et responsive sans interrompre SSE ni statistiques. Tout le travail., Une vue commune. et leur paragraphe MUST être absents.

#### Scenario: Métadonnées de supervision compactes
- **WHEN** MONITOR affiche un snapshot
- **THEN** dernière vue et cadence suivent l'identité du workspace sur la même ligne et ne sont plus affichées sur deux lignes dans le hero

#### Scenario: Consultation des archives
- **WHEN** ARCHIVES est sélectionné puis MONITOR
- **THEN** la page active et son libellé changent et les observations restent disponibles selon la cadence choisie

## ADDED Requirements

### Requirement: Classement par nombre de tâches cochées
Les tableaux RUN et Changes MUST être classés par tâches cochées décroissantes, puis changeId alphabétique (collation française), puis runId. Un RUN MUST utiliser l'avancement du change lié. L'avancement inconnu MUST rester inconnu et suivre les valeurs connues, même zéro. Le tri MUST préserver filtres, sélection et snapshot source.

#### Scenario: Nombre absolu et égalités
- **WHEN** plusieurs changes ont des nombres de tâches cochées différents ou identiques
- **THEN** le plus grand nombre apparaît d'abord, indépendamment du pourcentage, et les égalités suivent l'ordre alphabétique du change dans les deux tableaux

#### Scenario: Avancement inconnu
- **WHEN** une ligne n'a pas d'avancement disponible et une autre indique zéro tâche cochée
- **THEN** la ligne connue à zéro précède la ligne inconnue sans remplacer cette dernière par zéro
