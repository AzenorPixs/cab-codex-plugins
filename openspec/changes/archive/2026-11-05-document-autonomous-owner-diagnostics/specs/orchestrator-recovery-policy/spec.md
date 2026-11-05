## ADDED Requirements

### Requirement: Documentation des sources courantes
Le contrat MUST orienter l’orchestrateur vers les surfaces courantes du RUN et
les états MCP/natifs structurés. Il MUST distinguer timestamps historiques,
cache monitor périmé,état broker,décision locale et permission native. Un signal
historique seul MUST NOT créer un blocage ou un accord opérationnel.

#### Scenario: Tour rejeté et ancien timestamp busy
- **WHEN** la session est absente de l’API active avec part terminale et permissions vides
- **THEN** les procédures utilisent leurs preuves courantes sans imposer l’ordre historique busy/idle

### Requirement: Documentation de la couverture propriétaire
Le contrat MUST distinguer présence de policy et couverture de l’action cible.
Dans le change autorisé, l’orchestrateur MUST pouvoir cadrer sa policy bornée
sans nouvelle demande humaine, puis prélever un plan frais. Les ressources et
les gardes existantes MUST rester inchangées.

#### Scenario: Policy présente mais insuffisante
- **WHEN** policySetupRequired=false et l’action cible porte orchestrator-policy-required
- **THEN** la procédure fait vérifier action et ressources avant une policy neuve strictement bornée

### Requirement: Documentation des formes et empreintes
Le contrat MUST séparer arguments MCP,descripteur de stage et checkpoint. Il
MUST imposer des empreintes prélevées programmatiquement depuis leur source,
sans transcription ni confusion plan/preuve native. Les erreurs locales de
lecture MUST être distinguées d’une issue serveur inconnue.

#### Scenario: Métadonnées de checkpoint supplémentaires
- **WHEN** une comparaison globale diffère uniquement par les métadonnées locales
- **THEN** l’orchestrateur compare les champs du schéma revu sans réécrire le mandat natif

### Requirement: Documentation de clôture broker après retrait
Le contrat MUST décrire la clôture propriétaire d’une demande broker encore
PENDING après retrait local CANCELLED et accès RELEASED, avec identité exacte,
quiescence et absence de native/nativeResult/once. Il MUST conserver les reçus
et l’APPROVED local historique ; un brokerAPPROVED reste non annulable.

#### Scenario: Réponse exécutable retirée et demande PENDING
- **WHEN** la décision exécutable est absente et les preuves complètes de retrait et libération concordent
- **THEN** le propriétaire peut clore uniquement la demande encore PENDING par son cancel natif unique, puis vérifier état/readiness sans nouvel effet

### Requirement: Documentation de terminalité et lecture ciblée
Skill,plugin et commande MUST orienter vers les seules références du cas. Le
contrat MUST distinguer diagnostic BLOCKED/HUMAN_REQUIRED et gate terminal
validé selon le prompt. Une récupération dans le change MUST rester décidée
par l’orchestrateur, sans permission ou clôture métier déduite d’un diagnostic.

#### Scenario: Faux blocage local
- **WHEN** un helper local refuse un objet conforme ou lit un état historique
- **THEN** l’orchestrateur corrige son interprétation et suit la voie qualifiée sans relâcher les gardes serveur ni redémarrer le RUN

### Requirement: Documentation des niveaux de preuve d’exécution
Le contrat MUST distinguer booléen executed,diagnostic conservateur et résultat
durable corrélé. executed=false seul MUST NOT autoriser NO_EFFECT ou un rejeu.
Une clôture normale MUST suivre ses gardes et preuves d’effet ; les vrais
reçus de rejet avant once MUST NOT être inventés après une exécution.

#### Scenario: Shell terminé et diagnostic conservateur
- **WHEN** une part expose executed=false mais une fin native et un résultat durable completed/exit0 correspondent à la once exacte
- **THEN** l’orchestrateur suit la clôture normale sous ses gardes, sans rejouer ni réécrire le diagnostic UNVERIFIED
