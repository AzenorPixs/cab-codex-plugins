## ADDED Requirements

### Requirement: Distribution des gardes de mandat et de l’édition native 2.1.10

La distribution source MUST aligner ses composants versionnés sur 2.1.10 et documenter le mécanisme d’édition partielle réellement qualifié, le catalogue natif distinct de search et l’attente de mandat du superviseur. Cette préparation MUST NOT modifier les briques actives ou leur raccord OpenCode. CABU MUST rester une activation distincte coordonnée.

#### Scenario: Sources préparées sans activation
- **WHEN** la qualification et les tests source réussissent
- **THEN** les composants source partagent 2.1.10 et les preuves distinguent source, archivage, publication et activation

## MODIFIED Requirements

### Requirement: Prévention des outils natifs en lecture seule
Le protocole distribué MUST demander à l'orchestrateur de interdire explicitement les actions natives shell, edit (y compris write), subagent et skill par les permissions V2 de la seule session ciblée, relues avant génération pour tout mandat d'inventaire ou d'analyse en lecture seule. Les outils de lecture et recherche autorisés MAY rester disponibles. 

#### Scenario: Inventaire protégé
- **WHEN** un inventaire lecture seule est transmis par l'API de messagerie OpenCode
- **THEN** ses outils natifs et d'écriture sont désactivés explicitement et aucun mandat exécutable implicite n'est accordé


### Requirement: Réactivation limitée des outils exécutables
La restriction lecture seule MUST NOT modifier la configuration persistante OpenCode ni produire une approbation générale. La réactivation MUST limiter les outils au mandat unitaire, rétablir ask sans génération par PATCH V2 de la seule session ciblée et le vérifier par lecture native avant génération. Le prompt V2 MUST NOT réécrire les permissions ni transmettre tools ou noReply. Une preuve absente ou divergente MUST suspendre le mandat.

#### Scenario: Mandat exécutable suivant
- **WHEN** l'orchestrateur passe d'un inventaire à une opération native
- **THEN** seuls les outils nécessaires sont réactivés sans génération, ask est rétabli et vérifié, puis l'opération exige sa propre décision CAB

#### Scenario: Réactivation permissive détectée
- **WHEN** une activation produit une règle allow ou qu'un contrôle natif échoue
- **THEN** aucun mandat exécutable n'est généré tant que ask n'est pas prouvé


### Requirement: Distribution du cycle de vie CAB 2.1.9
La distribution source MUST aligner ses composants versionnés sur 2.1.10 et inclure le module de cycle de vie dans les fermetures d’import du contrôleur, superviseur et moniteur. Les unités MUST empêcher le redémarrage automatique après un nettoyage incomplet identifié. La préparation MUST NOT installer, activer ou modifier les RUN réels.

#### Scenario: Paquet source qualifié
- **WHEN** CAB 2.1.9 est préparé
- **THEN** ses versions et imports sont cohérents et aucune activation réelle n’est déduite des tests

### Requirement: Skill de statistiques embarqué dans CAB
Le plugin CAB SHALL distribuer coding-session-statistics et ses métadonnées sans plugin Tools Codex ni skill cgpt externe. Le protocole et la commande SHALL imposer les statistiques après chaque archive réussie selon archive-session-statistics. Les composants versionnés SHALL partager la base de version courante ; le plugin MAY ajouter un cachebuster Codex.

#### Scenario: Installation depuis la marketplace CAB
- **WHEN** le plugin CAB est installé depuis sa marketplace
- **THEN** les skills CAB et coding-session-statistics sont présents et résolus depuis le manifeste

#### Scenario: Release cohérente
- **WHEN** le patch 2.1.9 est préparé
- **THEN** broker, contrôleur, superviseur, collecteurs, scripts, plugins et commandes annoncent la même base 2.1.10


