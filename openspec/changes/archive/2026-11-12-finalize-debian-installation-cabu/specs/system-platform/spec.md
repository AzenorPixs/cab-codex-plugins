## ADDED Requirements

### Requirement: Finalisation CABU locale du paquet
postinst MUST appeler une finalisation commune après démarrage et contrôle du
service. Elle MUST enregistrer un reçu durable et actualiser les intégrations
configurées sans invoquer APT, dpkg, cab update ou un téléchargement. cab update
MUST réutiliser ce reçu sans doubler les effets de postinst.

#### Scenario: Mise à jour Debian par DIU
- **WHEN** le paquet est installé directement par APT ou DIU
- **THEN** les intégrations et le reçu CABU sont finalisés sans réinstallation récursive

#### Scenario: Reprise d’une finalisation
- **WHEN** une finalisation identique est rappelée
- **THEN** les étapes terminées ne sont pas répétées et les erreurs restent explicites

### Requirement: Distribution des extensions Codex par compte configuré
Le paquet MUST fournir plugins CAB/CCAB/CABU, leurs skills et commandes dans son
payload commun. La finalisation MUST les activer pour les seuls UID configurés,
root compris, avec sauvegarde et préservation des extensions tierces. Elle MUST
conserver SID, RUN, générations, gel et effets protégés, sans relancer les sessions.

#### Scenario: Compte Codex configuré
- **WHEN** le paquet est actualisé pour un compte déclaré
- **THEN** ses trois plugins, leurs skills et commandes sont disponibles sans toucher ses autres extensions

#### Scenario: Bootstrap non validé
- **WHEN** le paquet est installé sur une machine CAB non initialisée
- **THEN** les effets par compte sont reportés sans créer de base ou session avant validation Web

### Requirement: Blocs Agents et états observés
Administration Agents MUST présenter OpenCode et Codex côte à côte, adaptés au
mobile. Le nom MUST être gras et vert si installé, rouge sinon. Les processus et
transports MCP MUST avoir une pastille verte si attestés, rouge sinon avec état
non vérifié lorsque nécessaire. Chemins binaire et connecteur MUST être non éditables.

#### Scenario: Binaire présent sans processus
- **WHEN** le binaire est installé mais aucun processus correspondant n’est observé
- **THEN** le nom est vert et la pastille d’activité est rouge, avec version et chemin installés

#### Scenario: Connecteur local relié
- **WHEN** les extrémités stdio d’un processus CAB MCP ont des pairs ouverts
- **THEN** la connexion du transport est signalée sans confondre déclaration et connexion

### Requirement: Releases GitHub quotidiennes
CAB MUST conserver un cache de versions GitHub consulté une fois par jour UTC
à horaire aléatoire persistant, dans cab.service. Les clés facultatives
opencode_release_repository et codex_release_repository MUST désigner owner/repo.
La page MUST afficher la version disponible si différente, sans accès Web à son
chargement ni installation automatique ; un échec MUST conserver la valeur connue.

#### Scenario: Rechargements de page
- **WHEN** l’administrateur recharge Agents plusieurs fois dans la journée
- **THEN** le cache est affiché sans multiplier les consultations GitHub

### Requirement: Administration sans chemin de configuration technique
Les sous-pages Administration MUST NOT afficher la mention du chemin /etc/cab/cab.json.
Cette présentation MUST NOT changer le stockage ou les droits de la configuration.

#### Scenario: Navigation dans l’administration
- **WHEN** une sous-page Administration est ouverte
- **THEN** le chemin cab.json est absent de l’écran tandis que ses réglages restent utilisables

### Requirement: Entités persistantes de coordination
CAB MUST disposer des tables projects, runs, sessions et changes, avec données
et configuration JSON propres. La migration MUST conserver les identifiants,
SID, générations, mandats, reçus et clés étrangères existants. Une session native
MAY être associée à plusieurs RUN ; chaque RUN MUST référencer son projet, sa
session connue et son change, sans inventer d’identité native absente.

#### Scenario: Migration des RUN existants
- **WHEN** le schéma normalisé est appliqué à une base existante
- **THEN** les relations session/change sont reprises sans changer les identités ou les protections des RUN

### Requirement: Étapes et tâches du tableau des sessions
Le tableau MUST afficher Étape et Tâches réalisées. Le cycle MUST conserver les
onze étapes Initialisation, Prévol, Analyse, Cadrage, Spécification, Implémentation,
Vérifications, Revue, Archivage, Statistiques, Clôture. Une déclaration propriétaire
MUST pouvoir revenir en arrière ; une étape absente MUST rester non renseignée.
Les compteurs MUST provenir du tasks.md canonique du change actif ou archivé.

#### Scenario: Position et avancement distincts
- **WHEN** une étape est déclarée ou les cases de tasks.md changent
- **THEN** la projection temps réel reflète ces données sans valider les autres étapes ni le gate terminal

### Requirement: Détail du RUN lié au change
Un clic sur le RUN MUST ouvrir /projects/<project_id>/runs/<run_id>. La page MUST
afficher identité, état, change, SID, étape, phase, activité observée, mandat,
gate, demandes indécises, jalon prouvé, attente, blocages et les onze étapes.
Elle MUST montrer les tâches du change et leur provenance ; les données absentes
MUST rester Non observé ou Non renseigné, sans inférence de réussite.

#### Scenario: Change archivé ou indisponible
- **WHEN** la page individuelle est consultée
- **THEN** les tâches sont lues du change unique actif ou archivé, ou signalées indisponibles sans lecture hors projet

### Requirement: Tâches mémorisées par change
La table change_tasks MUST conserver chaque tâche avec son change, identité de
source, libellé, état, ordre, ligne, empreinte et date d’observation. tasks.md MUST
rester la source de vérité. Une tâche retirée du fichier MUST être conservée comme
inactive ; un fichier indisponible MUST NOT effacer les observations antérieures.

#### Scenario: Cases modifiées et tâche retirée
- **WHEN** tasks.md est actualisé puis observé
- **THEN** les tâches et compteurs sont actualisés atomiquement, les tâches retirées restent mémorisées et aucun gate du RUN n’est validé par les cases
