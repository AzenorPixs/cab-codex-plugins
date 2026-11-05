## MODIFIED Requirements

### Requirement: Réactivation limitée des outils exécutables
La restriction lecture seule MUST NOT modifier la configuration persistante OpenCode ni produire une approbation générale. La réactivation MUST limiter les outils au mandat unitaire, utiliser noReply, rétablir ask par PATCH de la seule session ciblée et le vérifier par lecture native avant génération. Le message de génération MUST NOT réécrire tools. Une preuve absente ou divergente MUST suspendre le mandat.

#### Scenario: Mandat exécutable suivant
- **WHEN** l'orchestrateur passe d'un inventaire à une opération native
- **THEN** seuls les outils nécessaires sont réactivés sans génération, ask est rétabli et vérifié, puis l'opération exige sa propre décision CAB

#### Scenario: Réactivation permissive détectée
- **WHEN** tools true produit une règle allow ou qu'un contrôle natif échoue
- **THEN** aucun mandat exécutable n'est généré tant que ask n'est pas prouvé

## ADDED Requirements

### Requirement: Distribution cohérente du correctif 1.0.1
Le broker, le contrôleur, le superviseur, les scripts versionnés, la commande et le plugin MUST publier la version de base 1.0.1. Le plugin MUST utiliser un cachebuster neuf. Les versions de schéma et de protocole MCP MUST rester inchangées. La préparation source MUST NOT modifier les services actifs, les caches installés ou les états des RUN.

#### Scenario: Jeu source vérifié
- **WHEN** les contrôles de distribution du correctif réussissent
- **THEN** les versions exécutables sont cohérentes sans annoncer un déploiement actif
