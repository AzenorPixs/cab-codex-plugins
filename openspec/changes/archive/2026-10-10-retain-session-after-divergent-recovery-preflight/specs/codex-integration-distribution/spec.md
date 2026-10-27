## MODIFIED Requirements

### Requirement: Réinitialisation obligatoire d'une nouvelle session CAB

La commande `/cab start` et la skill SHALL purger le runtime avant chaque
nouvelle session CAB. Une reprise du même RUN, un compactage, une reconnexion
ou `run`, `test`, `update`, `stop` SHALL conserver le runtime ; un prévol de récupération divergent SHALL NOT déclencher une nouvelle session ni une purge.

#### Scenario: Ancien état disponible
- **WHEN** `/cab start` ouvre une nouvelle session et aucun travail précédent n'est actif
- **THEN** le protocole purge les états historiques du broker, du contrôleur et du superviseur sans réadopter leur job ou leurs décisions

#### Scenario: Reprise du même RUN
- **WHEN** CAB reprend le même RUN y compris après un prévol de récupération divergent
- **THEN** les preuves et demandes restent conservées sans purge

#### Scenario: Sous-commande sans nouveau démarrage
- **WHEN** `run`, `test`, `update` ou `stop` est exécutée sans nouveau démarrage
- **THEN** elle ne déclenche aucune purge de début de session

### Requirement: Arrêt contrôlé avant purge

L'orchestrateur SHALL prouver propriété et inactivité du contexte, sans session
occupée, mandat en cours ni permission non résolue. Un RUN actif SHALL
interdire la purge. Il SHALL arrêter les ressources CAB, déconnecter le
broker nativement et vérifier son verrou, sans tuer le broker ni fermer ou
redémarrer OpenCode.

#### Scenario: Travail actif ou inactivité non prouvée
- **WHEN** un travail reste actif, une propriété est inconnue ou un effet reste non réconcilié
- **THEN** la purge est refusée sans effacer le runtime

### Requirement: Prévol neuf après purge

Après purge, CAB SHALL reconnecter le broker, vérifier contexte et modèle,
créer une nouvelle session et exiger broker_readiness READY sans demande ni
permission parasite. Un test CAB SHALL prouver décision explicite, réponse MCP
corrélée et exécution unique de true.
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
version de base `0.87.2`, le plugin pouvant ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills `approval-bridge` et `coding-session-statistics` sont présents dans le paquet et résolus depuis son manifeste

#### Scenario: Release cohérente
- **WHEN** la release est validée
- **THEN** le broker, le contrôleur, le superviseur, le plugin et la commande annoncent tous la version de base `0.87.2`

## REMOVED Requirements

### Requirement: Nouvelle session après prévol de récupération divergent
**Reason**: Remplacé par la reprise sans renouvellement ni purge.
**Migration**: Réconcilier et utiliser retry explicite dans la candidate conservée.

### Requirement: Neutralisation avant abandon technique
**Reason**: Remplacé par la reprise sans renouvellement ni purge.
**Migration**: Réconcilier et utiliser retry explicite dans la candidate conservée.

### Requirement: Deux espaces runtime et preuves hors purge
**Reason**: Remplacé par la reprise sans renouvellement ni purge.
**Migration**: Réconcilier et utiliser retry explicite dans la candidate conservée.

### Requirement: Prévol exact de la nouvelle session exceptionnelle
**Reason**: Remplacé par la reprise sans renouvellement ni purge.
**Migration**: Réconcilier et utiliser retry explicite dans la candidate conservée.

## ADDED Requirements

### Requirement: Prévol divergent dans la même session
Après un prévol divergent ou incomplet refusé sans effet, l'orchestrateur MUST conserver session candidate, job, RUN et runtime. Il MUST NOT renouveler la session, abandonner le job ni purger pour cet incident. Le mandat erroné MUST rester refusé sans normalisation.

#### Scenario: Champ ou commande divergent
- **WHEN** un champ prescrit manque ou diverge et le prévol est refusé avant exécution sans effet
- **THEN** l'orchestrateur réconcilie puis demande retry dans la même candidate avec identifiants de requête et approbation neufs

#### Scenario: Délai MCP seul
- **WHEN** seule la réponse MCP manque sans divergence prouvée
- **THEN** l'orchestrateur interroge le même approval_id sans nouvelle demande ni retry

### Requirement: Prévol corrigé avant reprise métier
Après retry explicite, l'orchestrateur MUST exiger /usr/bin/true exact, change attendu, décision explicite corrélée, permission native unique, exit 0 puis broker_readiness READY sans demande ni permission parasite. Il MUST conserver le gel jusqu'à complete prouvé.

#### Scenario: Échec répété sans effet
- **WHEN** le prévol diverge de nouveau et les préconditions de retry sont rétablies
- **THEN** une nouvelle tentative explicite reste dans la même candidate et le même job, sans concurrence ni rejeu d'écriture

#### Scenario: Preuve ou effet incertain
- **WHEN** une preuve manque ou un effet reste inconnu
- **THEN** l'orchestrateur suspend les opérations et demande l'autorité indispensable sans purge ni renouvellement
