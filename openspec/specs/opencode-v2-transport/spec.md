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

Toute preuve d'effet MUST corréler une permission native once, session, appel, cible, horodatages et état final. Pour les outils natifs OpenCode 2.2 reconnus, executed est informatif et MUST NOT remplacer ces contrôles ; metadata.status et metadata.exit MUST établir la fin de shell. Un état final ou le drapeau executed seul MUST NOT prouver l'effet.

#### Scenario: Outil terminé et exécuté

- **WHEN** le transcript V2 identifie l'appel, sa cible, son état final et son résultat, corrélés à une permission once propre
- **THEN** CAB peut utiliser la preuve native, y compris pour shell terminé avec executed faux

#### Scenario: Exécution non prouvée

- **WHEN** seule une valeur executed est fournie, ou si la permission, les dates ou la corrélation native divergent
- **THEN** CAB refuse la preuve d'effet

### Requirement: Version majeure CAB 2.0.0 uniforme
Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités et moniteur distribués MUST annoncer la version de base courante commune fixée par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter un cachebuster après cette version. Aucune brique active ne MUST annoncer une version de base 1.x.

#### Scenario: Vérification des versions distribuées
- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.12` et les manifestes conservent leur cachebuster propre

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
Les contrôles MCP MUST cibler la location serveur découverte sans scope de projet et revérifiée avant contrôle. Les sessions et permissions MUST garder leur workspace propre. CAB MUST vérifier les enveloppes et MUST NOT créer un second broker. Le cache MUST être lié au PID ; un changement de location pour le même PID ou un argument explicite divergent MUST être refusé avant tout contrôle MCP.

#### Scenario: Serveur partagé et projet distinct
- **WHEN** le serveur OpenCode est dans un répertoire et les sessions travaillent dans un autre
- **THEN** CAB reconnecte uniquement le broker partagé de la location serveur et cible les sessions avec leur propre répertoire

### Requirement: Projection stricte des appels Code Mode natifs

CAB MUST reconnaître seulement les enveloppes execute dont le programme retourne directement un appel nommé avec données littérales concordant avec les métadonnées natives. Il MUST conserver identité et empreinte de l'enveloppe complète. Il MUST NOT évaluer le programme ni accepter une transformation de résultat, un appel caché, une liste divergente ou une sortie tronquée. Les parties directes déjà supportées MUST rester inchangées.

#### Scenario: Appel unique concordant

- **WHEN** execute retourne directement un appel MCP connu avec objet JSON littéral et métadonnées natives concordantes
- **THEN** CAB expose l'opération corrélée en conservant son origine et son empreinte, sans accorder de permission
- **AND** les clés identifiants statiques non citées sont reconnues, les valeurs restent des données JSON sans variable ni expression

#### Scenario: Enveloppe ambiguë

- **WHEN** le programme transforme la sortie, ajoute un appel, diverge des métadonnées ou présente un résultat tronqué
- **THEN** CAB conserve une preuve bloquante et refuse toute admission ou fin déduite de cette enveloppe

### Requirement: Qualification native de la permission et de la fin Code Mode

Une projection Code Mode MUST conserver les contrôles de session, cible, décision, ask, once et fin native. Une intention en cours MAY contribuer à l'admission d'une demande exacte ; elle MUST NOT prouver son exécution ou sa fin. Une qualification sur OpenCode 2.2 isolé MUST vérifier la chaîne complète avant livraison du raccord.

#### Scenario: Prévol natif complet

- **WHEN** le serveur isolé exécute le prévol sous une décision corrélée et une permission once propre
- **THEN** CAB vérifie la source native, la commande exacte, exit 0 et READY avant complete

#### Scenario: Permission ou fin non prouvée

- **WHEN** l'identité, la permission ou la fin de l'appel ne peut être corrélée
- **THEN** CAB conserve le gel et ne déduit aucun succès du texte retourné

### Requirement: Découverte Code Mode à acquittement littéral non autorisant

CAB MAY reconnaître un unique search à objet de données littérales suivi du retour d'une chaîne littérale. Il MUST vérifier la liste native exacte, les arguments concordants, la fin et l'absence de troncature. La projection MUST rester diagnostique, avec empreinte de l'enveloppe. Son texte MUST NOT établir une décision, un état métier ou une autorisation. Tout appel ajouté ou toute expression inconnue MUST rester bloquant.

#### Scenario: Acquittement fixe après découverte

- **WHEN** le programme appelle seulement search sur un objet littéral puis retourne une chaîne fixe avec métadonnées natives concordantes
- **THEN** CAB conserve un diagnostic de découverte sans autorité, quel que soit le texte de cette chaîne

#### Scenario: Expression ou effet supplémentaire

- **WHEN** le programme ajoute un appel, retourne une variable ou diverge des métadonnées natives
- **THEN** CAB refuse la projection sans attribuer de droit au résultat

### Requirement: Catalogue natif distinct du catalogue MCP

La qualification OpenCode 2.2 MUST identifier les outils et schémas réellement transmis au modèle par un fournisseur synthétique isolé. Le protocole CAB MUST distinguer ce catalogue natif du résultat search Code Mode, des permissions et du prompt. Un résultat search vide MUST NOT prouver l’absence d’un outil natif.

#### Scenario: Recherche MCP vide
- **WHEN** search ne trouve aucun edit dans le catalogue MCP
- **THEN** le diagnostic conserve la disponibilité native comme non établie jusqu’à l’examen du catalogue transmis au modèle

### Requirement: Édition partielle native qualifiée

CAB MUST qualifier le mécanisme d’édition partielle réellement proposé par OpenCode 2.2 avant de le recommander. La qualification MUST corréler cible unique, schéma natif, ask, décision explicite, once et fin vérifiée. Une cible divergente, une demande refusée ou un remplacement ambigu MUST NOT produire une édition approuvée implicitement. Le protocole MUST NOT inventer un outil à partir du seul prompt.

#### Scenario: Remplacement ciblé approuvé
- **WHEN** l’outil natif disponible reçoit un remplacement unitaire exact et une décision CAB corrélée
- **THEN** la permission once propre et le contenu final du seul fichier démontrent l’édition partielle

#### Scenario: Refus et ambiguïté
- **WHEN** l’opération est refusée ou son remplacement n’est pas univoque
- **THEN** aucune écriture correspondante n’est constatée et aucun succès n’est déduit du texte du modèle

### Requirement: Isolation de la lecture des permissions par session

Le client MAY restreindre une lecture de permissions à une session explicitement identifiée avant la validation des cibles natives. Une permission identifiée comme étrangère MUST NOT empêcher ce contrôle ciblé ni être répondue par ce contrôle. Une identité manquante ou une permission propre malformée MUST rester bloquante. La lecture globale MUST conserver sa validation stricte.

#### Scenario: Permission étrangère multirésource
- **WHEN** un contrôle vise la session A et que la session B possède une permission shell multirésource
- **THEN** le contrôle valide les seules permissions de A sans répondre à B ni affaiblir le contrôle de ses cibles

#### Scenario: Permission propre ou identité ambiguë
- **WHEN** une permission propre a une cible invalide ou qu’une permission ne peut être attribuée à une session
- **THEN** le contrôle ciblé échoue explicitement sans autorisation

### Requirement: Métriques natives V2 distinctes des métadonnées libres

Le client MUST exposer les tokens et coûts natifs V2 valides dans le message normalisé, avec leur provenance. Une valeur absente MUST rester inconnue ; une valeur malformée MUST NOT devenir une mesure valide. Les métadonnées libres MUST NOT fabriquer une mesure native. La documentation des sondes MUST distinguer session.text.delta de session.reasoning.delta et calculer les durées seulement sur les événements corrélés observés.

#### Scenario: Mesures natives présentes
- **WHEN** un message assistant V2 fournit ses tokens et son coût natifs valides
- **THEN** le client conserve ces mesures sans reconstruction et les distingue des métadonnées du modèle

#### Scenario: Mesures absentes ou falsifiées
- **WHEN** seules des métadonnées libres contiennent des tokens ou un coût, ou que les valeurs natives sont absentes ou invalides
- **THEN** aucune mesure native n’est inventée et les mesures indisponibles restent explicitement inconnues

### Requirement: Projection des erreurs MCP natives V2

CAB MAY projeter l’erreur d’un unique request_validation ou get_approval retourné directement par execute. La fin native MUST porter metadata.error vrai, truncated faux et un seul toolCalls en erreur dont le nom et les arguments concordent. CAB MUST dériver sa marque de provenance de cette enveloppe et MUST NOT accepter une marque fabriquée dans les métadonnées libres. Cette projection MUST NOT constituer une décision ni une preuve d’absence d’effet à elle seule.

#### Scenario: Erreur native concordante
- **WHEN** l’enveloppe complète qualifiée concorde avec l’unique appel autorisé
- **THEN** CAB expose son erreur et son empreinte natives sans déduire une approbation ou un retry admissible

#### Scenario: Texte seul ou appel caché
- **WHEN** seule une chaîne d’erreur est fournie, les métadonnées divergent ou un autre appel est présent
- **THEN** CAB conserve une enveloppe bloquante sans provenance d’erreur qualifiée

### Requirement: Provenance des erreurs MCP natives directes

CAB MAY reconnaître une erreur directe de request_validation ou get_approval seulement depuis une partie tool assistant portant executed faux, status error, un objet error de type tool.execution, un itemId natif lié au callID et des temps natifs complets ordonnés. La provenance et son empreinte MUST être dérivées de la partie complète ; les marqueurs libres MUST être supprimés. Cette provenance MUST NOT suffire à autoriser un retry.

#### Scenario: Partie directe qualifiée
- **WHEN** la partie native satisfait toutes les gardes et identifie exactement l’un des deux outils
- **THEN** le client conserve son erreur, son identité et son empreinte qualifiées sans décision implicite

#### Scenario: Provenance absente ou falsifiée
- **WHEN** l’erreur est un texte libre, l’identité diverge, les temps sont absents ou un marqueur libre est fourni
- **THEN** aucune provenance native directe qualifiée n’est attribuée

### Requirement: Pagination de messages adaptative sous plafond constant

Le client MUST conserver le plafond de réponse existant. Sur opencode-response-too-large seulement, il MAY réduire de moitié la limite de la même page jusqu’à un minimum de un, sans conserver de réponse partielle ni avancer le curseur. Curseurs, ordre, enveloppes et borne de pages MUST rester contrôlés. Un message unique dépassant le plafond MUST échouer explicitement. Les autres erreurs MUST NOT déclencher une réduction ou un faux succès.

#### Scenario: Page agrégée trop grande
- **WHEN** la page demandée dépasse le plafond mais une page plus petite respecte la limite
- **THEN** le client suit les pages complètes et les curseurs jusqu’à la fin, sans troncature ni duplication

#### Scenario: Un seul message dépasse le plafond
- **WHEN** une page de un dépasse encore la limite
- **THEN** la lecture échoue explicitement sans résultat partiel

#### Scenario: Curseur ou erreur divergents
- **WHEN** un curseur se répète, une page est invalide ou une erreur différente survient
- **THEN** le contrôle existant échoue sans réessai adaptatif non autorisé

### Requirement: Découverte serveur sans contexte implicite
GET /api/info et la découverte de la location MCP MUST être envoyés sans en-tête ni paramètre directory. Les sessions ordinaires MUST conserver leur ciblage explicite. Une découverte ou location invalide MUST bloquer le contrôle sans reconnexion automatique.

#### Scenario: Client de workspace technique
- **WHEN** un client construit avec un répertoire technique demande les métadonnées serveur
- **THEN** aucune requête de découverte ne sélectionne ce workspace technique

#### Scenario: Divergence à PID inchangé
- **WHEN** la location globale change alors que le PID serveur reste identique
- **THEN** le client refuse le contrôle MCP sans mutation

### Requirement: Session de sonde dans la location partagée
createProbeSession MUST créer une session dédiée au workspace du broker partagé, seulement lorsque ce broker est connected, avec tous les outils interdits. Les remplacements de directory, permissions ou agent MUST être refusés. Le POST de création MUST cibler explicitement la même location que son corps. Aucun échec de sonde MUST déclencher de réparation MCP.

#### Scenario: Sonde sans contexte concurrent
- **WHEN** une sonde est créée depuis un client dont le workspace par défaut est distinct
- **THEN** la session appartient à la location partagée avec deny global, sans création de contexte MCP étranger

#### Scenario: Broker indisponible ou options élargies
- **WHEN** le broker n’est pas connecté ou que l’appel fournit un répertoire, agent ou permissions propres
- **THEN** aucune session de sonde n’est créée et aucune reconnexion n’est tentée

#### Scenario: Remplacement du serveur pendant préparation
- **WHEN** le PID change entre la découverte de location et la vérification MCP de la sonde
- **THEN** le client refuse sa création avant POST sans initialiser le précédent workspace

### Requirement: Entrée modèle sans variante native implicite
createSession, createProbeSession, prompt et switchModel MUST refuser tout champ propre model.variant avec opencode-model-variant-unsupported et un message français fixe demandant model.reasoning, avant tout appel HTTP. La présence simultanée de reasoning MUST NOT rendre variant valide. Les lectures MUST conserver leur variante native ; un appelant MUST convertir explicitement la forme lue avant écriture. Le niveau omis intentionnellement MUST rester compatible.

#### Scenario: Modèle relu réinjecté sans conversion
- **WHEN** un appel fournit providerID, modelID et variant, seul ou accompagné de reasoning, même nul ou indéfini
- **THEN** le client refuse avant réseau sans créer de session, changer de modèle, transmettre un prompt ou recopier les valeurs du modèle dans l’erreur

#### Scenario: Conversion explicite vers reasoning
- **WHEN** l’appelant prépare providerID, modelID et reasoning à partir de la variante native relue
- **THEN** le client transmet cette valeur comme variante native et conserve le format de lecture existant

#### Scenario: Niveau volontairement absent
- **WHEN** un modèle valide ne fournit ni reasoning ni variant
- **THEN** le client conserve l’omission du niveau dans la requête sans imposer un nouveau défaut

### Requirement: Raccord fournisseur natif confidentiel
Le client MUST utiliser POST /api/integration/{integrationID}/connect/key selon le contrat V2 qualifié, avec secret fourni uniquement au processus par un canal privé. Il MUST vérifier l’identité serveur et la frontière partagée avant effet, puis la connexion opaque sans lire GET /api/credential ni stockage privé. Il MUST NOT exposer le secret, utiliser V1 ou imposer un redémarrage OpenCode. Une réponse incertaine MUST rester signalée comme effet possible sans rejeu.

#### Scenario: Compte connecté à chaud
- **WHEN** une nouvelle clé est fournie par un gestionnaire sous frontière coordonnée
- **THEN** le raccord vérifie le changement de connexion native et la prise en compte à la génération suivante sans fermeture du processus

#### Scenario: Pair actif ou réponse incertaine
- **WHEN** une activité empêche la frontière ou que le POST peut avoir été appliqué sans confirmation
- **THEN** le raccord refuse avant effet dans le premier cas et conserve l’incertitude après effet dans le second, sans secret ni seconde injection automatique

### Requirement: Adoption et continuité historique distinguées
Une transition completed MUST indiquer que l’adoption du choix ne prouve pas la continuité historique. Le protocole MUST exiger une preuve native sans outil dans la session historique avant RESUME, distincte d’une sonde neuve. Une erreur de métadonnées chiffrées liées au compte MUST NOT devenir une incompatibilité de raisonnement ou déclencher une nouvelle PLLM. Aucun historique ou secret réel MUST être lu/modifié pour la qualification.

#### Scenario: Sonde fraîche réussie et histoire non portable
- **WHEN** la nouvelle connexion fonctionne en sonde fraîche mais l’histoire existante reçoit un refus de contexte chiffré
- **THEN** la session reste sous frontière sûre, le choix valide et le blocage de continuité sont distingués sans nouveau SID ni effacement

#### Scenario: Mécanisme natif absent
- **WHEN** le contrat2.2.0 et le banc exact ne fournissent pas de parcours conservant les contraintes demandées
- **THEN** le rapport indique la limite, ses preuves et conditions de reprise sans annoncer une réparation ou une API inventée
