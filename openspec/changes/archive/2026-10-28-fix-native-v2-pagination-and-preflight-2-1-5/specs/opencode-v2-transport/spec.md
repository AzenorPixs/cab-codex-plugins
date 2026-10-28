## MODIFIED Requirements

### Requirement: Transport natif V2 normalisé et borné
Le client MUST utiliser les routes V2 documentées pour le serveur, les sessions, les messages, les permissions, le MCP et les événements. Il MUST valider les enveloppes, identifiants et champs consommés par CAB. Les réponses paginées MUST être suivies jusqu'à la fin lorsque l'historique complet est requis. order MUST être envoyé uniquement sur la première page ; les curseurs MUST NOT être combinés avec order.

#### Scenario: Liste des sessions paginée
- **WHEN** l'historique est paginé par l'API V2
- **THEN** CAB suit les curseurs jusqu'à la fin et refuse toute page malformée, répétée ou divergente

#### Scenario: Permission native unique
- **WHEN** une décision CAB `approved` est corrélée à une permission native exacte
- **THEN** CAB répond avec `decision: once`, marque la décision consommée seulement après une réponse HTTP réussie et conserve la corrélation native

#### Scenario: Décision non exécutable
- **WHEN** CAB traite une décision qui n'autorise pas l'exécution du mandat
- **THEN** il n'envoie aucune réponse `once` et toute réponse native de refus reste corrélée à la même session et demande

#### Scenario: Déconnexion ou événement perdu
- **WHEN** `/api/event` échoue, se ferme ou signale une déconnexion de location
- **THEN** CAB reste en reconnexion, réconcilie santé, MCP, sessions et permissions par les routes V2, puis ne reprend qu'après preuve cohérente

#### Scenario: Curseur natif portant son ordre
- **WHEN** une page fournit un curseur suivant
- **THEN** le client suit ce curseur sans order et conserve les refus de page invalide, répétée ou divergente

### Requirement: Version majeure CAB 2.0.0 uniforme
Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités et moniteur distribués MUST annoncer la version de base courante commune fixée par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter un cachebuster après cette version. Aucune brique active ne MUST annoncer une version de base 1.x.

#### Scenario: Vérification des versions distribuées
- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.5` et les manifestes conservent leur cachebuster propre

#### Scenario: Faux succès HTML
- **WHEN** une route API répond HTTP 200 avec HTML, du JSON malformé ou un schéma divergent
- **THEN** CAB refuse la réponse comme `opencode-v2-response-invalid` et ne marque aucune source saine
