## MODIFIED Requirements

### Requirement: Skill de statistiques embarqué dans CAB

Le plugin `cab-approval-bridge` SHALL distribuer le skill
`coding-session-statistics` et ses métadonnées sous son répertoire `skills/`.
Son installation SHALL rendre ce skill disponible sans plugin Tools Codex
et sans skill `cgpt` externe. Le protocole et la commande CAB SHALL imposer
sa production de statistiques après chaque archivage réussi selon
`archive-session-statistics`. Les composants versionnés SHALL partager la
version de base `0.87.1`, le plugin pouvant ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills `approval-bridge` et `coding-session-statistics` sont présents dans le paquet et résolus depuis son manifeste

#### Scenario: Release cohérente
- **WHEN** la release est validée
- **THEN** le broker, le contrôleur, le superviseur, le plugin et la commande annoncent tous la version de base `0.87.1`

### Requirement: Nouvelle session après prévol de récupération divergent

Après le feu vert, l'orchestrateur MUST déclencher sans nouvelle confirmation
une nouvelle session CAB pour un prévol divergent ou incomplet prouvé et
refusé avant exécution sans effet, après toutes les préconditions de sûreté.
Le mandat MUST rester refusé sans normalisation. L'automatisation MUST
appartenir à l'orchestrateur ; /job/recover MUST NOT purger ni approuver.

#### Scenario: Champ ou délai prescrit omis
- **WHEN** les arguments natifs omettent ou altèrent un identifiant, une cible, une commande, une métadonnée ou un délai prescrit, dont approval_id, files ou timeout_seconds
- **THEN** l'orchestrateur MUST appliquer la procédure après preuve native du refus et de l'absence d'effet ; une demande malformée avant enregistrement MAY être admise sur ces mêmes preuves, sans nouveau feu vert ni état terminal du RUN parent

#### Scenario: Commande ou change divergent
- **WHEN** le prévol transmet true au lieu de /usr/bin/true, un suffixe ou un autre change_id et le mandat est refusé sans effet
- **THEN** l'exception MUST être admissible sans exiger deux écarts simultanés et sans normaliser ni approuver la demande

#### Scenario: Double écart prouvé
- **WHEN** le prévol de récupération échoué a transmis true et un autre change_id
- **THEN** l'orchestrateur MUST appliquer l'exception après ses contrôles obligatoires sans redemander le feu vert

#### Scenario: Autre incident
- **WHEN** l'incident ne prouve pas un prévol divergent admissible et présente seulement un HTTP 409, un texte de l'agent ou un paramètre non prescrit
- **THEN** l'orchestrateur MUST conserver les règles ordinaires sans inventer une divergence ou une autorisation de purge

#### Scenario: Réponse MCP temporairement absente
- **WHEN** request_validation atteint son délai sans preuve native de divergence
- **THEN** l'orchestrateur MUST interroger le même approval_id sans créer une nouvelle demande ni purger pour ce seul délai

#### Scenario: Effet ou propriété incertain
- **WHEN** un effet reste inconnu, une preuve manque ou le contexte n'est pas exclusivement maîtrisé
- **THEN** l'orchestrateur MUST interdire l'exception automatique et demander l'autorité indispensable

### Requirement: Neutralisation avant abandon technique

Avant purge exceptionnelle, l'orchestrateur MUST geler le travail, traiter les
rapports, réconcilier les effets et neutraliser demandes et permissions sans
les approuver. Les gardes de propriété, inactivité et preuves MUST être
établies. Le seul job technique gelé avec gate OPEN MAY être abandonné sans
fabriquer un gate valide ni le désarmer artificiellement.

#### Scenario: Job gelé et sessions inactives
- **WHEN** un prévol admissible, la propriété du contexte, les sessions inactives et l'absence de mandat actif ou en attente, de permission non résolue et d'effet inconnu sont prouvés
- **THEN** l'orchestrateur MUST arrêter les seules ressources CAB du contexte sans fabriquer une clôture normale ni fermer OpenCode

#### Scenario: Demande ou permission restante
- **WHEN** un mandat indécis, une permission divergente ou une transmission reste à réconcilier
- **THEN** l'orchestrateur MUST refuser les permissions divergentes et clôturer les demandes sans les approuver, puis vérifier à nouveau toutes les préconditions avant purge

### Requirement: Prévol exact de la nouvelle session exceptionnelle

Après purge, l'orchestrateur MUST créer une session et un job technique neufs.
Le prévol MUST utiliser exactement /usr/bin/true sans suffixe, le change_id
attendu, une décision explicite, une réponse MCP corrélée, une permission
consommée une fois et exit 0. La readiness finale MUST être READY sans demande
ni permission parasite. Un échec MUST interdire la reprise métier.

#### Scenario: Prévol encore divergent
- **WHEN** un nouveau prévol est refusé sans effet et les préconditions sont à nouveau établies
- **THEN** l'orchestrateur MUST relancer la procédure avec identifiants de session, job, requête et approbation neufs, sans approbation implicite ni état terminal du RUN parent

#### Scenario: Prévol exact réussi
- **WHEN** le nouveau prévol apporte toutes les preuves exactes et la readiness finale requise
- **THEN** le travail métier MAY reprendre au premier jalon non prouvé après réconciliation du checkpoint, du change attendu et des critères
