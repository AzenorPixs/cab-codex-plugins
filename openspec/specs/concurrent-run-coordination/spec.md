# concurrent-run-coordination Specification

## Purpose
Coordonner plusieurs RUN pilotés dans un contexte OpenCode commun : attribuer exclusivement les changes, contrôler les ressources et dépendances, isoler permissions et reprises, puis sérialiser une publication réconciliée sans décision implicite.

## Requirements

### Requirement: Réservation atomique exclusive
CAB MUST attribuer un change et sa clé de sélection à un seul RUN avant
préparation ou implémentation. L'attribution MUST être durable avant réponse
et corrélée au projet, à l'orchestrateur et à la session native. Deux
sélections simultanées MUST produire au plus une réservation admise.

#### Scenario: Sélection concurrente
- **WHEN** deux RUN demandent le même change ou la même clé de sélection
- **THEN** une demande est admise et l'autre reçoit un conflit sans effet

### Requirement: Ressources et dépendances compatibles
CAB MUST refuser les réservations dont une écriture recouvre une ressource
déjà réservée. Deux lectures MAY coexister. Les dépendances actives ou
inconnues MUST différer l'admission. Codex MUST examiner les dépendances
sémantiques ; CAB MUST NOT déduire l'indépendance des seuls chemins.

#### Scenario: Contrat partagé
- **WHEN** A réserve un contrat en écriture et B demande ce contrat en lecture
- **THEN** B reçoit un conflit et peut sélectionner un autre candidat compatible

### Requirement: Propriétaire durable et génération
CAB MUST conserver la réservation après interruption et récupération du RUN.
Chaque extension MUST contrôler la version attendue et les conflits. Une
ancienne génération MUST NOT autoriser une permission. Un délai seul MUST
NOT libérer ni transférer la réservation.

#### Scenario: Reprise après crash
- **WHEN** le contrôleur redémarre avec une réservation persistée
- **THEN** il la conserve et refuse toute reprise avec une ancienne génération

### Requirement: Couverture des mandats
Chaque mandat MUST être inclus dans les ressources réservées. Une commande
MUST déclarer ses ressources et CAB MUST NOT deviner ses effets shell.
Avant once, CAB MUST vérifier session native, racine, RUN, change et
génération. Une réservation MUST NOT constituer une approbation.

#### Scenario: Extension non admise
- **WHEN** un mandat vise un fichier hors réservation ou une génération ancienne
- **THEN** CAB refuse sa transmission sans produire de permission native

### Requirement: Clôture et exclusion d'intégration
La publication dans la référence commune MUST être sérialisée et précédée
des validations applicables sur la base actuelle. La réservation MUST être
conservée jusqu'à livraison et rapport vérifiés ou abandon réconcilié. Une
absence de candidat disponible MUST NOT prouver la fin globale du projet.

#### Scenario: Autres RUN actifs
- **WHEN** tous les candidats restants dépendent d'un autre RUN actif
- **THEN** CISMP attend sans déclarer le projet terminé

### Requirement: Infrastructure partagée protégée
Le profil concurrent MUST utiliser un seul broker MCP stdio dans un contexte
OpenCode commun. Créer ou arrêter un RUN MUST NOT purger ni interrompre les
autres RUN. Une opération globale MUST exiger leur inactivité et la
réconciliation de toutes les permissions et effets.

#### Scenario: Deuxième RUN
- **WHEN** un second RUN rejoint l'infrastructure déjà saine
- **THEN** il obtient son contexte sans purge ni reconnexion du broker commun

### Requirement: Barrière stable du répertoire partagé
Avant intégration, les RUN métier réservés MUST déclarer un jalon stable avec
preuves locales, sans mandat ni effet en attente. Le propriétaire MUST suspendre
les opérations des pairs et vérifier la quiescence native de tous les RUN,
y compris documentaires. Après libération, les RUN métier MUST réconcilier la
référence avant mandat et réexaminer les validations affectées sans rejouer les
effets prouvés. La phase documentaire MUST rester limitée à son rapport.

#### Scenario: Validation globale et publication
- **WHEN** A intègre pendant que B possède une réservation indépendante
- **THEN** B attend à un jalon stable puis réconcilie la référence publiée avant reprise

#### Scenario: Rapport natif en cours
- **WHEN** A demande l'intégration pendant que B écrit son rapport documentaire
- **THEN** A attend la quiescence native et aucune nouvelle écriture de B n'est admise sous sa barrière

### Requirement: Prompts pilotés cohérents
Tous les prompts pilotés des projets inventoriés MUST utiliser le même
protocole de réservation et un checkpoint par RUN. Les sous-jobs MUST
hériter du RUN parent. CISM, CAISM et les prompts directs MUST rester
inchangés et MUST NOT être exécutés en concurrence avec ces travaux.

#### Scenario: Sous-job CISMP
- **WHEN** CISMP appelle SPCMP ou ISMP avec plusieurs changes présents
- **THEN** le sous-job traite exclusivement le change réservé par son RUN

### Requirement: File équitable d'intégration
Une demande explicite d'intégration MUST pouvoir rejoindre une file FIFO
persistante et idempotente par contexte. Seule la tête MUST pouvoir acquérir
la barrière, après les gardes de stabilité et quiescence. Les nouvelles
réservations MUST attendre ; les RUN déjà stables MUST suspendre leurs
nouveaux mandats. La réconciliation MUST conserver l'ordre de la file.
Une annulation MUST être explicite et MUST NOT libérer un effet inconnu.
Les acquisitions historiques sans file MUST rester disponibles.

#### Scenario: Deux demandes et publication
- **WHEN** A puis B demandent l'intégration et les pairs atteignent leur jalon stable
- **THEN** seul A acquiert, puis B réconcilie la nouvelle référence avant acquisition

### Requirement: Réduction contrôlée des ressources
Un RUN MUST pouvoir réduire ses ressources à une frontière quiescente avec
preuves et génération courante. La nouvelle portée MUST être incluse dans
l'ancienne et MUST NOT convertir read en write. La génération MUST changer.
L'obligation de publication des écritures MUST survivre à la réduction.

#### Scenario: Retrait d'une lecture globale
- **WHEN** un RUN termine ses contrôles globaux et réduit project:* à ses fichiers nécessaires
- **THEN** les ressources retirées ne bloquent plus les pairs et les anciennes générations sont refusées

### Requirement: Phase documentaire après publication
Après publication prouvée et libération de l'exclusion, un RUN MUST pouvoir
entrer dans une phase irréversible limitée au STATISTIQUES.md de sa propre
archive. Les autres ressources MUST être relâchées. Le rapport vérifié et
le gate TERMINÉ MUST rester requis avant livraison.

#### Scenario: Rapport préparé pendant la reprise du pair
- **WHEN** A a publié et entre en closing pendant que B réconcilie puis reprend
- **THEN** A prépare son rapport sans barrière globale et ne peut plus modifier son code

### Requirement: Isolation de la phase documentaire
Les mandats documentaires MUST respecter les permissions explicites et toute
exclusion active. Ils MUST NOT permettre une extension métier. Une nouvelle
référence MUST NOT invalider la publication métier figée pour cette seule phase.

#### Scenario: Publication d'un pair pendant closing
- **WHEN** B publie pendant que A finalise son rapport
- **THEN** A conserve sa publication, attend la levée de l'exclusion et ne reçoit qu'une permission documentaire corrélée
