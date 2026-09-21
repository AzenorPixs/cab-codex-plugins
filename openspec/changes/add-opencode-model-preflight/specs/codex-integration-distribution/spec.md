## MODIFIED Requirements

### Requirement: Commande de pilotage sûre
La commande Codex `/cab` SHALL être versionnée dans
`.codex/commands/cab.md` et proposer `start`, `run`, `test`, `update` et
`stop`. Elle SHALL orchestrer les ressources de communication CAB entre le
broker MCP et l'agent Codex, sans rendre de décision d'approbation ni modifier
le projet piloté. Elle SHALL préserver OpenCode et le broker MCP géré par
OpenCode lors de l'arrêt.

Avant de créer ou réutiliser une session de codage persistante, `/cab start`
SHALL consulter `GET /mcp` du serveur OpenCode et exiger que
`cgpt-validation` soit `connected`. Elle SHALL ensuite effectuer un prévol du
fournisseur, du modèle et du niveau de raisonnement effectivement configurés
pour l'agent de codage ciblé : lecture de la configuration locale, vérification
de disponibilité par l'API OpenCode, requête temporaire sans outil ni accès au
projet, puis contrôle des métadonnées réellement observées. Elle SHALL
échouer avec `CAB_INACTIF` sans créer ni réutiliser de session persistante si
une preuve est absente, si la requête échoue ou si une valeur diverge. Elle
SHALL ne jamais modifier ce choix de configuration.

#### Scenario: Prévol conforme du modèle OpenCode
- **WHEN** `/cab start` constate un MCP connecté et que la requête temporaire
  répond avec le fournisseur, le modèle et le raisonnement configurés
- **THEN** elle clôt la session temporaire et peut créer ou réutiliser la
  session persistante de codage

#### Scenario: Prévol divergent ou indisponible
- **WHEN** le fournisseur, le modèle ou le raisonnement observé est absent,
  indisponible ou différent de la configuration ciblée
- **THEN** `/cab start` publie `CAB_INACTIF` avec la cause et ne crée aucune
  session persistante

#### Scenario: Démarrage CAB
- **WHEN** `/cab start` est exécutée après un contrôle MCP sain et un prévol
  OpenCode conforme
- **THEN** elle installe ou actualise l'unité sans l'activer, démarre
  explicitement le contrôleur, vérifie son état, initialise la supervision CAB,
  puis crée ou réutilise une session persistante sans prendre de décision métier

#### Scenario: MCP non connecté
- **WHEN** `GET /mcp` ne présente pas `cgpt-validation` comme `connected`
- **THEN** `/cab start` réinitialise seulement l'instance OpenCode, attend une
  preuve de connexion et échoue sans créer de session si cette preuve reste
  absente

#### Scenario: Test CAB
- **WHEN** `/cab test` est exécutée
- **THEN** elle vérifie le chemin de validation complet dans la session
  persistante, sans modifier le projet piloté

#### Scenario: Arrêt CAB
- **WHEN** `/cab stop` est exécutée
- **THEN** elle ferme seulement les ressources CAB qu'elle a créées et ne ferme
  ni OpenCode ni le broker MCP géré par OpenCode

#### Scenario: Mise à jour disponible
- **WHEN** `/cab update` constate une version marketplace strictement plus
  récente que la version installée
- **THEN** elle exécute une seule fois l'actualisation native Codex et annonce
  le succès seulement après vérification de la version installée

#### Scenario: Plugin déjà à jour
- **WHEN** `/cab update` constate une version installée égale ou plus récente
- **THEN** elle n'exécute aucune actualisation et signale que le plugin est à
  jour

#### Scenario: Métadonnées non exploitables
- **WHEN** la marketplace, le plugin ou l'une des versions nécessaires est
  absent ou invalide
- **THEN** `/cab update` échoue sans actualiser ni modifier de configuration

#### Scenario: Migration depuis un marketplace local
- **WHEN** `cab_codex_plugins` désigne une source locale
- **THEN** `/cab update` la remplace par la source Git CAB et restaure la
  source locale si l'ajout Git échoue

#### Scenario: Commande de profil plus récente sur GitHub
- **WHEN** `/cab update` télécharge une commande GitHub valide dont la version
  est strictement plus récente que la copie de profil
- **THEN** elle remplace atomiquement la copie de profil et vérifie sa version
  avant d'annoncer le succès

#### Scenario: Commande de profil non actualisable
- **WHEN** la source GitHub est inaccessible, redirigée vers un autre hôte,
  invalide ou pas plus récente
- **THEN** `/cab update` préserve la copie locale et rapporte la cause observée

#### Scenario: Résumé des versions
- **WHEN** `/cab update` termine, avec succès ou échec
- **THEN** elle affiche les versions GitHub et locales exigées, et signale
  séparément toute valeur indisponible
