## MODIFIED Requirements

### Requirement: Réinitialisation obligatoire d'une nouvelle session CAB

La commande `/cab start` et la skill SHALL purger le runtime avant chaque
nouvelle session CAB. Une reprise du même RUN, un compactage, une reconnexion
ou `run`, `test`, `update`, `stop` SHALL conserver le runtime, sauf l'exception
« Nouvelle session après prévol de récupération divergent » définie ici.

#### Scenario: Ancien état disponible
- **WHEN** `/cab start` ouvre une nouvelle session et aucun travail précédent n'est actif
- **THEN** le protocole purge les états historiques du broker, du contrôleur et du superviseur sans réadopter leur job ou leurs décisions

#### Scenario: Reprise du même RUN
- **WHEN** CAB reprend le même RUN sans satisfaire l'exception de prévol divergent
- **THEN** les preuves et demandes restent conservées sans purge

#### Scenario: Sous-commande sans nouveau démarrage
- **WHEN** `run`, `test`, `update` ou `stop` est exécutée sans l'exception
- **THEN** elle ne déclenche aucune purge de début de session

### Requirement: Arrêt contrôlé avant purge

L'orchestrateur SHALL prouver propriété et inactivité du contexte, sans session
occupée, mandat en cours ni permission non résolue. Un RUN actif SHALL
interdire la purge, sauf son job technique gelé neutralisé selon l'exception
de prévol divergent. Il SHALL arrêter les ressources CAB, déconnecter le
broker nativement et vérifier son verrou, sans tuer le broker ni fermer ou
redémarrer OpenCode.

#### Scenario: Travail actif ou inactivité non prouvée
- **WHEN** un travail reste actif, une propriété est inconnue ou un effet reste non réconcilié
- **THEN** la purge est refusée sans effacer le runtime

### Requirement: Prévol neuf après purge

Après purge, CAB SHALL reconnecter le broker, vérifier contexte et modèle,
créer une nouvelle session et exiger broker_readiness READY sans demande ni
permission parasite. Un test CAB SHALL prouver décision explicite, réponse MCP
corrélée et exécution unique de true ; dans l'exception de prévol divergent,
la commande SHALL être exactement /usr/bin/true avec le change_id attendu.
Aucune ancienne preuve SHALL valider ce prévol.

#### Scenario: Nouvelle session vérifiée
- **WHEN** la purge réussit et la nouvelle session passe sa readiness et son test CAB
- **THEN** seuls ces résultats neufs autorisent le premier mandat

### Requirement: Skill de statistiques embarqué dans CAB

Le plugin `cab-approval-bridge` SHALL distribuer le skill
`coding-session-statistics` et ses métadonnées sous son répertoire `skills/`.
Son installation SHALL rendre ce skill disponible sans plugin Tools Codex
et sans skill `cgpt` externe. Le protocole et la commande CAB SHALL imposer
sa production de statistiques après chaque archivage réussi selon
`archive-session-statistics`. Les composants versionnés SHALL partager la
version de base `0.86.9`, le plugin pouvant ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills `approval-bridge` et `coding-session-statistics` sont présents dans le paquet et résolus depuis son manifeste

#### Scenario: Release cohérente
- **WHEN** la release est validée
- **THEN** le broker, le contrôleur, le superviseur, le plugin et la commande annoncent tous la version de base `0.86.9`

## ADDED Requirements

### Requirement: Nouvelle session après prévol de récupération divergent

Après le feu vert, l'orchestrateur MUST être autorisé sans nouvelle confirmation
à reprendre une nouvelle session CAB si une récupération échouée prouve à la
fois true au lieu de /usr/bin/true et un change_id divergent. Il MUST refuser
le mandat erroné sans normalisation. Cette exception MUST NOT couvrir les
autres échecs et MUST NOT être exécutée automatiquement par /job/recover.

#### Scenario: Double écart prouvé
- **WHEN** le prévol de récupération échoué a transmis true et un autre change_id
- **THEN** l'orchestrateur peut appliquer l'exception après ses contrôles obligatoires sans redemander le feu vert

#### Scenario: Autre incident
- **WHEN** les deux écarts ne sont pas prouvés ensemble
- **THEN** les règles ordinaires de récupération et d'autorisation restent applicables

### Requirement: Neutralisation avant abandon technique

Avant purge exceptionnelle, l'orchestrateur MUST geler le travail, traiter les
rapports, réconcilier les effets, refuser les permissions divergentes et
clôturer les demandes restantes. Il MUST prouver l'inactivité des sessions et
du contexte. Un job gelé avec gate OPEN MAY être abandonné par arrêt technique
dans cette seule procédure, sans déclarer un gate valide ni désarmer
artificiellement le job.

#### Scenario: Job gelé et sessions inactives
- **WHEN** le double écart et l'absence d'effets inconnus ou de permissions restantes sont prouvés
- **THEN** l'orchestrateur arrête les seules ressources CAB du contexte sans fabriquer une clôture normale

### Requirement: Deux espaces runtime et preuves hors purge

La purge exceptionnelle MUST utiliser l'outil existant sur les deux espaces
réellement résolus du home OpenCode et de la racine projet, en tenant compte
des chemins personnalisés. Avant suppression, checkpoint métier et preuves
des écritures validées MUST être préservés hors cibles. Un espace partagé avec
un autre travail, une preuve absente ou une cible non sûre MUST interdire la
purge. Les gardes de verrou et de chemin MUST rester inchangées.

#### Scenario: Préservation du travail prouvé
- **WHEN** les deux espaces dédiés sont purgés
- **THEN** approbations, journal, job et autres états techniques disparaissent ; sources, checkpoint métier, rapports et historiques natifs restent hors purge

### Requirement: Prévol exact de la nouvelle session exceptionnelle

Après purge exceptionnelle, l'orchestrateur MUST créer une nouvelle session
et un nouveau job technique avec des identifiants neufs. Le prévol MUST
utiliser exactement /usr/bin/true, sans suffixe, avec le change_id attendu du
checkpoint, décision explicite, permission consommée une seule fois et exit 0.
La readiness finale MUST être READY sans demande ni permission parasite.

#### Scenario: Prévol encore divergent
- **WHEN** true, un suffixe ou un autre change_id apparaît dans le nouveau prévol
- **THEN** la reprise métier reste interdite, sans normalisation ni approbation implicite
