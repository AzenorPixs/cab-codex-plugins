## ADDED Requirements

### Requirement: Empreinte approuvée des arguments d’écriture
Un mandat fichier MUST pouvoir porter tool_input_sha256, empreinte canonique des arguments natifs exacts approuvés. Broker, retry et décision MUST conserver cette valeur et refuser sa substitution ou suppression. Le protocole MUST exiger cette empreinte pour les nouveaux mandats write/edit ; les mandats historiques sans champ MUST rester compatibles sans protection revendiquée.

#### Scenario: Retry divergent
- **WHEN** une identité existante revient avec une empreinte changée ou supprimée
- **THEN** le broker refuse sans nouvelle demande ni nouvelle décision

### Requirement: Vérification native avant permission once
Le client MUST dériver l’empreinte depuis la partie native du call source et sa cible vérifiées, jamais depuis une métadonnée libre. Pour un mandat protégé, le contrôleur MUST comparer cette preuve avant once ; absence ou divergence MUST bloquer et invalider l’exécution sans consommer une permission ou reconstruire une décision.

#### Scenario: Même chemin et contenu modifié
- **WHEN** le modèle propose une entrée différente au chemin approuvé
- **THEN** aucune once n’est transmise et le fichier reste inchangé jusqu’au rejet explicite puis nouvelle proposition autorisée

#### Scenario: Entrée exacte et contrôles existants
- **WHEN** empreinte native, cible, décision et accès correspondent
- **THEN** une seule once reste possible et le résultat final est encore vérifié après écriture
