## MODIFIED Requirements

### Requirement: Commande de pilotage sûre
La commande Codex `/cab` SHALL être versionnée dans
`.codex/commands/cab.md` et proposer `start`, `run`, `test`, `update` et
`stop`. Elle SHALL orchestrer les ressources de communication CAB entre le
broker MCP et l'agent Codex, sans rendre de décision d'approbation ni modifier
le projet piloté. Elle SHALL préserver OpenCode et le broker MCP géré par
OpenCode lors de l'arrêt.

Avant de créer une session de codage, `/cab start` SHALL consulter `GET /mcp`
du serveur OpenCode et exiger que `cgpt-validation` soit `connected`. En cas
d'échec, elle MAY réinitialiser l'instance par `POST /instance/dispose`, puis
SHALL attendre un état sain ; elle SHALL ne jamais démarrer ni arrêter le
broker directement. Après ce contrôle, elle SHALL créer ou réutiliser une
session OpenCode persistante et SHALL transmettre les mandats par la
messagerie native de cette session.

`/cab update` SHALL vérifier que la marketplace `cab_codex_plugins` utilise la
source Git `AzenorPixs/cab-codex-plugins`, branche `main`, avec une extraction
sparse `.agents/plugins` et `plugins`. Si une source locale homonyme est
détectée, elle SHALL mémoriser sa racine, la remplacer par la source Git et la
restaurer si l'ajout Git échoue. Elle SHALL actualiser l'instantané Git par
`codex plugin marketplace upgrade cab_codex_plugins`, comparer le manifeste
distant de `cab-approval-bridge` à la version installée et appeler
`codex plugin add cab-approval-bridge@cab_codex_plugins` seulement si le
manifeste distant est strictement plus récent. Elle SHALL refuser une version
absente ou invalide et SHALL vérifier la version installée après la réinstallation.

`/cab update` SHALL aussi télécharger exclusivement
`.codex/commands/cab.md` depuis `https://github.com/AzenorPixs/cab-codex-plugins`,
branche `main`, vérifier son frontmatter versionné et comparer cette version
SemVer à la copie de profil Codex. Elle SHALL remplacer atomiquement cette
copie seulement si GitHub fournit une version strictement plus récente. Une
copie locale sans version MAY être remplacée par une copie GitHub valide. Un
échec réseau, une redirection d'hôte, une version invalide ou une version
distante égale ou antérieure SHALL préserver la copie locale. Elle SHALL ne
démarrer, arrêter ni modifier aucune ressource CAB ou configuration Codex, à
l'exception de la migration réversible de sa marketplace locale vers la source
Git spécifiée.

À la fin, `/cab update` SHALL afficher un résumé séparant les versions GitHub
et locales du manifeste du plugin, du contrôleur, du broker et de la commande
`/cab`. La version locale du broker SHALL provenir de
`broker_readiness.server_version`. Toute version indisponible SHALL être
signalée comme telle sans être déduite d'une autre source.

#### Scenario: Démarrage CAB
- **WHEN** `/cab start` est exécutée
- **THEN** elle vérifie `/mcp`, initialise ou reprend le contrôleur et la supervision CAB, puis crée ou réutilise une session persistante sans prendre de décision métier

#### Scenario: MCP non connecté
- **WHEN** `GET /mcp` ne présente pas `cgpt-validation` comme `connected`
- **THEN** `/cab start` réinitialise seulement l'instance OpenCode, attend une preuve de connexion et échoue sans créer de session si cette preuve reste absente

#### Scenario: Test CAB
- **WHEN** `/cab test` est exécutée
- **THEN** elle vérifie le chemin de validation complet dans la session persistante, sans modifier le projet piloté

#### Scenario: Arrêt CAB
- **WHEN** `/cab stop` est exécutée
- **THEN** elle ferme seulement les ressources CAB qu'elle a créées et ne ferme ni OpenCode ni le broker MCP géré par OpenCode

#### Scenario: Mise à jour disponible
- **WHEN** `/cab update` constate une version marketplace strictement plus récente que la version installée
- **THEN** elle exécute une seule fois l'actualisation native Codex et annonce le succès seulement après vérification de la version installée

#### Scenario: Plugin déjà à jour
- **WHEN** `/cab update` constate une version installée égale ou plus récente
- **THEN** elle n'exécute aucune actualisation et signale que le plugin est à jour

#### Scenario: Métadonnées non exploitables
- **WHEN** la marketplace, le plugin ou l'une des versions nécessaires est absent ou invalide
- **THEN** `/cab update` échoue sans actualiser ni modifier de configuration

#### Scenario: Migration depuis un marketplace local
- **WHEN** `cab_codex_plugins` désigne une source locale
- **THEN** `/cab update` la remplace par la source Git CAB et restaure la source locale si l'ajout Git échoue

#### Scenario: Commande de profil plus récente sur GitHub
- **WHEN** `/cab update` télécharge une commande GitHub valide dont la version est strictement plus récente que la copie de profil
- **THEN** elle remplace atomiquement la copie de profil et vérifie sa version avant d'annoncer le succès

#### Scenario: Commande de profil non actualisable
- **WHEN** la source GitHub est inaccessible, redirigée vers un autre hôte, invalide ou pas plus récente
- **THEN** `/cab update` préserve la copie locale et rapporte la cause observée

#### Scenario: Résumé des versions
- **WHEN** `/cab update` termine, avec succès ou échec
- **THEN** elle affiche les versions GitHub et locales exigées, et signale séparément toute valeur indisponible
