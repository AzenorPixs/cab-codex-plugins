## MODIFIED Requirements

### Requirement: Commande de pilotage sûre

La commande Codex `/cab` SHALL être versionnée dans `.codex/commands/cab.md` et proposer
`start`, `run`, `test`, `update` et `stop`. La commande `/cab` SHALL orchestrer les
ressources de communication CAB entre le broker MCP et l'agent Codex, sans rendre de
décision d'approbation ni modifier le projet piloté. La commande `/cab` SHALL préserver
OpenCode et le broker MCP géré par OpenCode lors de l'arrêt.

#### Scenario: Démarrage CAB
- **WHEN** `/cab start` est exécutée
- **THEN** elle purge le runtime selon le contrat de nouvelle session, vérifie `/mcp`, initialise le contrôleur et la supervision CAB, puis crée une nouvelle session maîtresse sans prendre de décision métier

#### Scenario: MCP non connecté
- **WHEN** `GET /mcp` ne présente pas `cgpt-validation` comme `connected`
- **THEN** `/cab start` réinitialise seulement l'instance OpenCode, attend une preuve de connexion et échoue sans créer de session si cette preuve reste absente

#### Scenario: Prévol conforme du modèle OpenCode
- **WHEN** le MCP est connecté et que le prévol constate une réponse avec le fournisseur, le modèle et le raisonnement configurés
- **THEN** `/cab start` clôt la session temporaire et peut créer la nouvelle session maîtresse

#### Scenario: Prévol divergent ou indisponible
- **WHEN** le prévol ne peut pas confirmer le fournisseur, le modèle ou le raisonnement configurés
- **THEN** `/cab start` publie `CAB_INACTIF` et ne crée aucune session persistante

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

#### Scenario: Superviseur absent ou divergent
- **WHEN** `/cab update` a validé le plugin installé et constate que le script
  ou l'unité du superviseur est absent ou divergent dans le profil Codex
- **THEN** elle les déploie atomiquement, recharge systemd et ne démarre ni
  n'active le service

### Requirement: Connexion MCP et création du RUN CAB

Avant de créer une session de codage, `/cab start` SHALL consulter `GET /mcp` du serveur
OpenCode et exiger que `cgpt-validation` soit `connected`. En cas d'échec, `/cab start`
MAY réinitialiser l'instance par `POST /instance/dispose`, puis SHALL attendre un état
sain ; `/cab start` SHALL ne jamais démarrer ni arrêter le broker directement. Après la
purge d'un nouveau RUN et ce contrôle, `/cab start` SHALL créer une nouvelle session
maîtresse OpenCode persistante.

#### Scenario: Connexion MCP et création du RUN CAB
- **WHEN** la purge du nouveau RUN est terminée mais cgpt-validation n'est pas connecté
- **THEN** aucune session de codage n'est créée avant un état MCP sain et CAB ne lance ni n'arrête directement le broker

### Requirement: Messagerie et reprise du même RUN CAB

`/cab start` MAY réutiliser la session seulement pour la reprise du même RUN, sans
purge. `/cab start` SHALL transmettre les mandats par la messagerie native de cette
session.

#### Scenario: Messagerie et reprise du même RUN CAB
- **WHEN** CAB reprend le même RUN avec sa session persistante
- **THEN** il conserve cette session sans purge et transmet les mandats par sa messagerie native

### Requirement: Prévol de l'identité du modèle OpenCode

Après la preuve MCP et avant de créer cette session persistante, `/cab start` SHALL
vérifier le fournisseur, le modèle et le niveau de raisonnement effectivement configurés
pour l'agent de codage ciblé. `/cab start` SHALL vérifier leur disponibilité via l'API
OpenCode, soumettre une requête temporaire sans outil ni accès au projet et contrôler
les métadonnées réellement observées.

#### Scenario: Prévol de l'identité du modèle OpenCode
- **WHEN** le MCP est connecté avant la création de la session persistante
- **THEN** le prévol sans outil ni accès au projet contrôle fournisseur, modèle, raisonnement, disponibilité et métadonnées observées

### Requirement: Refus d'un prévol modèle non conforme

Si une valeur est absente, indisponible ou divergente, `/cab start` SHALL publier
`CAB_INACTIF` avec la cause et ne créer aucune session persistante. `/cab start` SHALL
ne jamais modifier la configuration choisie par le développeur.

#### Scenario: Refus d'un prévol modèle non conforme
- **WHEN** une valeur de modèle attendue est absente ou divergente
- **THEN** CAB publie CAB_INACTIF avec sa cause, ne crée pas de session persistante et ne modifie pas la configuration choisie

### Requirement: Source Git et migration réversible de la marketplace CAB

`/cab update` SHALL vérifier que la marketplace `cab_codex_plugins` utilise la source
Git `AzenorPixs/cab-codex-plugins`, branche `main`, avec une extraction sparse
`.agents/plugins` et `plugins`. Si une source locale homonyme est détectée, `/cab
update` SHALL mémoriser sa racine, la remplacer par la source Git et la restaurer si
l'ajout Git échoue.

#### Scenario: Source Git et migration réversible de la marketplace CAB
- **WHEN** la marketplace CAB utilise une source locale homonyme et l'ajout Git échoue
- **THEN** la racine mémorisée est restaurée et les contraintes de source, branche et extraction sparse restent contrôlées

### Requirement: Actualisation conditionnelle du plugin CAB

`/cab update` SHALL actualiser l'instantané Git par `codex plugin marketplace upgrade
cab_codex_plugins`, comparer le manifeste distant de `cab-approval-bridge` à la version
installée et appeler `codex plugin add cab-approval-bridge@cab_codex_plugins` seulement
si le manifeste distant est strictement plus récent. `/cab update` SHALL refuser une
version absente ou invalide et SHALL vérifier la version installée après la
réinstallation.

#### Scenario: Actualisation conditionnelle du plugin CAB
- **WHEN** le manifeste distant fournit une version strictement plus récente
- **THEN** la commande native réinstalle le plugin puis vérifie la version réellement installée

### Requirement: Source et remplacement atomique de la commande de profil CAB

`/cab update` SHALL aussi télécharger exclusivement `.codex/commands/cab.md` depuis
`https://github.com/AzenorPixs/cab-codex-plugins`, branche `main`, vérifier son
frontmatter versionné et comparer cette version SemVer à la copie de profil Codex. `/cab
update` SHALL remplacer atomiquement cette copie seulement si GitHub fournit une version
strictement plus récente. Une copie locale sans version MAY être remplacée par une copie
GitHub valide.

#### Scenario: Source et remplacement atomique de la commande de profil CAB
- **WHEN** la commande GitHub possède une version valide strictement plus récente que la copie de profil
- **THEN** la copie est remplacée atomiquement après validation de sa source et de son frontmatter

### Requirement: Préservation des ressources pendant la mise à jour CAB

Un échec réseau, une redirection d'hôte, une version invalide ou une version distante
égale ou antérieure SHALL préserver la copie locale. `/cab update` SHALL ne démarrer,
arrêter ni modifier aucune ressource CAB ou configuration Codex, à l'exception du
déploiement atomique du superviseur et de son unité systemd utilisateur ainsi que de la
migration réversible de sa marketplace locale vers la source Git spécifiée.

#### Scenario: Préservation des ressources pendant la mise à jour CAB
- **WHEN** le téléchargement échoue ou la version distante n'est pas plus récente
- **THEN** la commande locale et les ressources CAB sont conservées hors des seules exceptions documentées

### Requirement: Déploiement du superviseur sans démarrage

`/cab update` SHALL installer ou actualiser le superviseur depuis le plugin installé
lorsqu'il est absent ou divergent, puis recharger systemd sans l'activer ni le démarrer.

#### Scenario: Déploiement du superviseur sans démarrage
- **WHEN** le superviseur installé est absent ou divergent
- **THEN** la commande le déploie depuis le plugin et recharge systemd sans activation ni démarrage

### Requirement: Résumé des versions réellement observées

À la fin, `/cab update` SHALL afficher un résumé séparant les versions GitHub et locales
du manifeste du plugin, du contrôleur, du superviseur, du broker et de la commande
`/cab`. La version locale du superviseur SHALL provenir du script déployé dans le profil
Codex. La version locale du broker SHALL provenir de `broker_readiness.server_version`.
Toute version indisponible SHALL être signalée comme telle sans être déduite d'une autre
source.

#### Scenario: Résumé des versions réellement observées
- **WHEN** une mise à jour CAB termine avec une version du broker actif inaccessible
- **THEN** le résumé distingue GitHub et local et indique la valeur indisponible sans la déduire du paquet
