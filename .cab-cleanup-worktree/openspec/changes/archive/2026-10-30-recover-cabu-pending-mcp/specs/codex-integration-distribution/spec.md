## ADDED Requirements

### Requirement: Attente des transitions MCP CABU
CABU MUST observer pending de façon bornée avec le budget existant, sans réémettre connect/disconnect. Une absence de confirmation MUST rester explicite. Un pending persistant MUST conserver un état nonterminal MCP_RECOVERY_REQUIRED dans le même journal, sans boucle native de repli ou nouvelle installation implicite. Les services CAB disponibles MUST rester accessibles lorsque leur code est intact.

#### Scenario: Pending transitoire
- **WHEN** une connexion devient connected dans le budget
- **THEN** une seule commande native est émise et versions/readiness restent à vérifier

#### Scenario: Pending persistant
- **WHEN** le budget expire
- **THEN** le reçu demeure réconciliable sans second connect/disconnect ni faux succès

### Requirement: Récupération MCP autorisée et unique
--recover-mcp MUST lier l’autorisation de rechargement global au reçu exact nonterminal, hors profils gelés/reuse-readonly. CABU MUST vérifier la frontière native, journaliser l’intention avant le POST et conserver PID/location/identités des sessions. Une intention déjà émise ou un résultat inconnu MUST NOT être rejoué. Demandes, once et modèles MUST rester hors de cette récupération.

#### Scenario: Récupération explicite
- **WHEN** l’opérateur autorise le reçu et la frontière est vérifiée
- **THEN** un seul rechargement global peut être envoyé sans arrêter OpenCode, puis identités, versions et readiness sont contrôlées

#### Scenario: Autorisation absente ou frontière invalide
- **WHEN** le reçu est étranger/terminal, le profil incompatible ou une activité/permission est présente
- **THEN** aucun rechargement ni nouvelle transaction n’est exécuté

#### Scenario: Intention durable sans réponse
- **WHEN** le POST expire ou le processus s’interrompt après intention
- **THEN** seules des observations peuvent réconcilier cette intention ; aucun second POST n’est envoyé

### Requirement: Clôture du reçu MCP récupéré
Une installation complète récupérée MUST terminer le même reçu après vérification des artefacts, versions et readiness fraîche. Un repli nécessaire MUST conserver et clore son reçu distinctement sans ouvrir une installation suivante dans cette récupération. Les erreurs historiques MUST rester traçables. Publication SCM MUST précéder CABU vérifié et information des sessions.

#### Scenario: Retour autonome du broker
- **WHEN** le raccord revient sans rechargement et l’installation est intacte
- **THEN** la reprise peut vérifier et clore le même reçu sans nouvel effet natif

#### Scenario: Ancien rollback non confirmé
- **WHEN** une récupération autorisée restaure le raccord
- **THEN** le même journal est réconcilié avant toute nouvelle installation distincte
