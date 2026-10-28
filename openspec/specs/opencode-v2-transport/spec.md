# opencode-v2-transport Specification

## Purpose
Définir le transport HTTP authentifié et les preuves natives OpenCode V2 utilisés exclusivement par les briques CAB 2.0.0.

## Requirements

### Requirement: OpenCode V2 uniquement
Le client natif CAB MUST valider `/api/info` et une version semver de majeure 2 avant opération. Il MUST utiliser uniquement les routes V2 et MUST NOT tenter une route V1 comme repli.

#### Scenario: OpenCode V2 valide
- **WHEN** `/api/info` retourne une version de majeure 2 et les schémas requis sont valides
- **THEN** le client poursuit les lectures ou opérations explicitement demandées avec les routes `/api/...` V2

#### Scenario: OpenCode 1.19.x refusé
- **WHEN** le serveur ne publie pas l'API V2 ou retourne une version de majeure 1
- **THEN** CAB retourne `opencode-v2-required`, sans requête vers les routes V1 ni modification d'état

### Requirement: Preuve d'exécution native V2
Toute preuve d'effet issue d'un outil de transcript MUST inclure `content[].executed === true`, l'état final et la corrélation de session, d'appel et de cible. Un état final seul MUST NOT prouver une exécution native.

#### Scenario: Outil terminé et exécuté
- **WHEN** le transcript V2 identifie l'appel, sa cible, son état final et `executed: true`
- **THEN** CAB peut vérifier cette preuve avec ses identifiants et ses bornes temporelles

#### Scenario: Exécution non prouvée
- **WHEN** `executed` est absent ou faux, ou si la corrélation native diverge
- **THEN** CAB n'enregistre aucun effet comme prouvé et garde les protections actives

### Requirement: Version majeure CAB 2.0.0 uniforme
Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités et moniteur distribués MUST annoncer la version de base courante commune fixée par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter un cachebuster après cette version. Aucune brique active ne MUST annoncer une version de base 1.x.

#### Scenario: Vérification des versions distribuées
- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.5` et les manifestes conservent leur cachebuster propre

#### Scenario: Faux succès HTML
- **WHEN** une route API répond HTTP 200 avec HTML, du JSON malformé ou un schéma divergent
- **THEN** CAB refuse la réponse comme `opencode-v2-response-invalid` et ne marque aucune source saine

### Requirement: Authentification HTTP Basic par credential local
Toute requête native CAB MUST utiliser HTTP Basic avec un credential local. Une réponse HTTP 401 MUST échouer avec `opencode-auth-required`.

Le nom d'utilisateur Basic Auth MUST être `opencode`, nom fixe d'OpenCode V2.

#### Scenario: Credential protégé
- **WHEN** le fichier répond aux contrôles de propriété, mode, taille et format
- **THEN** le client envoie le credential en mémoire dans l'en-tête Authorization sans l'exposer dans ses diagnostics

#### Scenario: Credential absent ou faible
- **WHEN** le fichier est absent, symbolique, accessible à d'autres utilisateurs, invalide ou vide
- **THEN** le client refuse l'appel avec `opencode-credential-unavailable` avant toute connexion HTTP

#### Scenario: Authentification refusée
- **WHEN** OpenCode répond HTTP 401
- **THEN** CAB rapporte `opencode-auth-required`, n'essaie pas une route V1 et ne répète pas la requête sans limite

### Requirement: Fichier credential protégé
Le mot de passe MUST être lu depuis `OC_Codex_OPENCODE_PASSWORD_FILE` ou son alias `OC_CGPT_`, avec défaut `~/.config/cab-approval-bridge/opencode.password`. Le fichier MUST être régulier, non symbolique, à lien unique, possédé par l'utilisateur courant, sans accès groupe/autres, de taille bornée et contenir une seule valeur UTF-8 non vide sur une ligne.

#### Scenario: Credential protégé
- **WHEN** le fichier répond aux contrôles de propriété, mode, taille et format
- **THEN** le client lit le credential localement pour préparer l'en-tête Basic Auth

#### Scenario: Credential faible ou ambigu
- **WHEN** le fichier est absent, symbolique, accessible à d'autres utilisateurs, invalide ou vide
- **THEN** le client refuse l'appel avec `opencode-credential-unavailable` avant toute connexion HTTP

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

### Requirement: Secret OpenCode absent des sorties et états
Le client MUST exclure le credential Basic des journaux, erreurs, métriques, événements monitor, historiques de décision, checkpoints et rapports. Les identifiants ne MUST NOT être inclus dans une URL ou dans un corps de requête CAB.

#### Scenario: Échec authentifié
- **WHEN** l'appel authentifié échoue
- **THEN** le diagnostic publie seulement une cause stable et le statut HTTP, sans en-tête, mot de passe, corps potentiellement sensible ni chaîne encodée

### Requirement: Ciblage natif explicite de location
Le client MUST transmettre x-opencode-directory pour les requêtes et événements ciblant un workspace. Il MUST vérifier les enveloppes retournées et refuser une location divergente. Il MUST NOT utiliser un repli V1.

#### Scenario: Paramètre directory ignoré
- **WHEN** OpenCode sélectionne sa location par en-tête HTTP
- **THEN** CAB cible le workspace demandé et vérifie la même location dans les réponses

### Requirement: Broker unique dans la location serveur
Les appels MCP de contrôle MUST cibler la location serveur obtenue par GET /api/location sans en-tête de projet. Les sessions et leurs permissions MUST garder leur workspace propre. CAB MUST vérifier la location de chaque réponse MCP et MUST NOT créer une seconde instance de broker dans le workspace d'un RUN. La découverte en cache MUST être liée au PID du serveur.

#### Scenario: Serveur partagé et projet distinct
- **WHEN** le serveur OpenCode est dans un répertoire et les sessions travaillent dans un autre
- **THEN** CAB reconnecte uniquement le broker partagé de la location serveur et cible les sessions avec leur propre répertoire
