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

Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités
et moniteur distribués MUST annoncer la version de base courante commune fixée
par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter
un cachebuster après cette version. Aucune brique active ne MUST annoncer une
version de base 1.x.

#### Scenario: Vérification des versions distribuées

- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.81` et les manifestes conservent leur cachebuster propre

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

### Requirement: Projection portable des anciennes métadonnées après transition
Après changement de PLLM ou de compte, CAB MUST permettre d’écarter les anciennes parties de raisonnement et métadonnées fournisseur de la seule requête projetée. Les enregistrements natifs, textes utiles, contrats d’outils et permissions MUST rester conservés. La projection MUST cibler explicitement session, modèle, fournisseur, connexion opaque et anciens identifiants, sans inspection des valeurs chiffrées ni secret dans les règles.

#### Scenario: Même modèle et compte cible
- **WHEN** le compte cible refuse les anciennes métadonnées du même modèle
- **THEN** un hook natif qualifié projette les anciens messages sans ces éléments, avec même modèle et historique enregistré inchangé

#### Scenario: Portée étrangère ou connexion modifiée
- **WHEN** une autre session est traitée ou la connexion ciblée change
- **THEN** la session étrangère reste inchangée et une connexion divergente bloque la projection ciblée sans repli ni rejeu

### Requirement: Reprise après projection prouvée
Le protocole MUST préparer la projection à une frontière autorisée puis vérifier le chargement natif et un échange historique sans outil avant reprise. Une sonde neuve MUST NOT suffire. Le mode2 demandé MUST conserver sa cible et son compte ; aucune alternative PLLM, réinitialisation, compaction ou nouvelle session MUST être déduite de cette remédiation.

#### Scenario: Continuité historique réussie
- **WHEN** la cible exacte répond dans l’histoire projetée sans outil ni erreur
- **THEN** le propriétaire peut conduire le prévol CAB neuf puis reprendre les seuls mandats autorisés, sans ancienne once rejouée

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

### Requirement: Omission native input du diagnostic readiness vide
CAB MAY projeter input absent comme{} seulement pour l’unique broker_readiness({}) littéral retourné directement, achevé avec executed=false, sans erreur et non tronqué. La métadonnée MUST porter le même outil achevé et ne pas posséder input. Les métadonnées et l’empreinte brute MUST rester conservées ; cette projection MUST NOT créer de décision ou de permission.

#### Scenario: Omission attestée et appel vide unique
- **WHEN** ces conditions exactes sont réunies
- **THEN** le diagnostic est reconnu avec arguments{} sans muter les métadonnées natives

#### Scenario: Forme voisine ou ambiguë
- **WHEN** input est présent mais divergent, les arguments sont non vides, un autre outil apparaît ou la fin/provenance est invalide
- **THEN** CAB conserve execute bloquant sans argument implicite ni assouplissement

### Requirement: Instruction native explicite du nouveau mandat
Le client CAB MUST proposer un helper explicite distinguant outils natifs et catalogue MCP, en conservant intégralement le mandat fourni. Une découverte MCP vide MUST NOT prouver l’absence de write/edit/shell natifs. Le helper MUST NOT attribuer de permission ni modifier les prompts existants implicitement.

#### Scenario: Catalogue MCP sans write
- **WHEN** un nouveau mandat est enveloppé par le helper natif
- **THEN** le codeur reçoit l’instruction d’utiliser l’outil natif disponible et de signaler son absence réelle sans changer d’outil ou de cible

### Requirement: Diagnostic de reprise sans autorité
CAB MUST proposer un diagnostic pur lié au SID et au message utilisateur exact, distinguant erreur fournisseur, découverte seule et arguments natifs incomplets/divergents. Les résultats MUST NOT exposer les corps ou erreurs libres, inférer une absence d’effet, déclencher PLLM, retry, décision ou once. La reprise MUST exiger réconciliation et nouveau mandat si nécessaire, sans compléter un fragment.

#### Scenario: Erreur fournisseur et fragment write
- **WHEN** un assistant corrélé échoue puis émet un fragment différent de l’entrée revue
- **THEN** le diagnostic impose de vérifier les effets et réconcilier ; les gardes exactes restent inchangées et aucune permission ne se rejoue

#### Scenario: Message étranger ou preuve absente
- **WHEN** l’ancre ou le SID est absent ou étranger
- **THEN** le diagnostic reste indisponible et ne déduit pas une réussite

### Requirement: Observation filtrée de la frontière de rechargement
Le client CAB MUST fournir une observation V2 de récupération contenant PID/version/location partagée, empreinte des IDs globaux des sessions et compteurs d’activité/permissions partagées, sans corps ou secret. Les lectures MUST rester bornées et ne pas initialiser de location étrangère. Cette observation MUST NOT valoir autorisation ou preuve d’absence d’effet métier.

#### Scenario: Préservation du processus et des sessions
- **WHEN** une récupération globale est explicitement autorisée
- **THEN** les observations avant/après permettent de refuser un changement de PID, location ou sessions sans restaurer artificiellement l’historique

### Requirement: Contrôle explicite ask avant envoi du prompt
Le client MUST proposer requiredNativeAsk sur prompt pour vérifier le SID/répertoire et les permissions natives avant envoi. Les exigences MUST être shell/edit explicites et nonvides. Une règle deny, allow, absente ou insuffisante MUST bloquer sans prompt, demandeMCP, PATCH ou once. Le contrôle MUST partager la résolution existante du contrôleur, dont les gardes indépendantes MUST rester inchangées.

#### Scenario: Prévol après revue en deny
- **WHEN** un nouveau prévol exige shell ask mais la session reste deny
- **THEN** le client refuse avant envoi et indique la politique observée sans la modifier

#### Scenario: Changement après observation
- **WHEN** la politique change après le contrôle client
- **THEN** le contrôleur conserve son refus à l’admission ou à once, sans autorisation implicite

### Requirement: Inspection de politique sans restauration automatique
Le client MUST exposer une inspection filtrée et une empreinte de politique natives. Sans exigence structurée, les prompts historiques de revue sans outil MUST rester possibles sous deny. Aucun contrôle, CABU ou prévol MUST rétablir automatiquement ask/allow ni modifier les autres sessions, modèles ou protections.

#### Scenario: Revue sans outil
- **WHEN** le propriétaire demande une proposition en lecture seule sous deny sans exigence native
- **THEN** le prompt reste possible sans levée de règle

### Requirement: Liaison du plugin au processus OpenCode courant
Le plugin de contexte MAY se rattacher au processus OpenCode courant si son PID configuré diffère uniquement lorsque le système prouve que l’ancien PID n’existe plus. Le plugin MUST NOT se rattacher si l’ancien PID répond encore ou si son existence ne peut pas être déterminée. Les règles de portabilité MUST rester identiques ; le changement de PID ne modifie ni session, fournisseur, modèle, connexion ni messages ciblés.

#### Scenario: Redémarrage après fin de l’ancien processus
- **WHEN** OpenCode charge le plugin dans un nouveau processus et que la vérification du PID configuré renvoie ESRCH
- **THEN** le plugin utilise le PID du processus courant et conserve les règles existantes

#### Scenario: Ancien processus encore actif
- **WHEN** le PID configuré répond encore au contrôle de présence
- **THEN** le plugin refuse l’activation avec cab-context-process-changed

#### Scenario: État du PID indéterminé
- **WHEN** le contrôle échoue pour une cause autre que PID absent
- **THEN** le plugin refuse l’activation en fail-closed sans inscrire de hook

### Requirement: Retour direct de la découverte Code Mode

Le normaliseur V2 MAY reconnaître `return await search(<objet littéral>);`
comme `cab_codemode_discovery` seulement si l’enveloppe prouve un appel unique
`search` achevé avec les mêmes arguments, sans troncature ni autre appel. La
projection MUST rester diagnostique et scellée par l’empreinte complète. Un
await sans retour, une expression supplémentaire ou des métadonnées
divergentes MUST rester non normalisé.

#### Scenario: Search retourné directement

- **WHEN** execute retourne un unique search littéral avec métadonnées concordantes
- **THEN** CAB expose une discovery read-only sans décision ni permission

#### Scenario: Search attendu sans retour

- **WHEN** execute attend search sans retourner sa valeur
- **THEN** CAB conserve l’enveloppe non corrélée et bloque l’admission de récupération

### Requirement: Routes filesystem V2 liées à la location

Le client V2 MUST utiliser `/api/fs/read/*`, `/api/fs/list` et `/api/fs/find` avec la location native exacte. Les chemins de lecture MUST être relatifs et refuser traversée, chemin absolu et source exclue.

#### Scenario: Location native exacte

- **WHEN** le client appelle une route filesystem V2
- **THEN** il transmet la location exacte en query et en en-tête et conserve le chemin relatif

### Requirement: Réponse filesystem textuelle bornée

La lecture MUST être bornée à 1 Mio par défaut et 2 Mio au maximum. Le client MUST décoder en UTF-8 strict, retourner longueur et SHA-256, accepter uniquement MIME explicitement admis et refuser tout contenu invalide ou excessif.

#### Scenario: Lecture source textuelle native

- **WHEN** le client lit un fichier de la location exacte avec un MIME admis, une taille bornée et du UTF-8 valide
- **THEN** il retourne un instantané read-only contenant chemin relatif, longueur, empreinte et contenu

#### Scenario: Type MIME ou contenu non admis

- **WHEN** une lecture renvoie un type MIME non admis, du UTF-8 invalide ou dépasse la limite
- **THEN** le client annule la réponse et refuse le contenu sans fallback vers une commande

### Requirement: Chemins retournés limités à la location

Les listings et recherches MUST restituer des chemins relatifs sous la location. L'entrée de racine et les chemins externes MUST être omis. Un chemin absolu MUST être converti seulement s'il reste sous la location exacte ; un séparateur final MUST être retiré uniquement pour un directory.

#### Scenario: Listing de racine et chemins externes

- **WHEN** le résultat natif contient une entrée racine, un chemin extérieur, un absolu interne ou un séparateur final de directory
- **THEN** CAB filtre ou normalise ces entrées selon leurs limites de location et de type

### Requirement: Réponse filesystem liée à l'identité native

Le client MUST relire PID, version et répertoire de la session avant et après chaque appel. Une divergence MUST invalider le résultat ; aucune identité ou location déclarée par le client ne peut être adoptée.

#### Scenario: Dérive d'identité pendant une lecture

- **WHEN** le PID, la version ou la location de la session native change pendant l'appel filesystem
- **THEN** le résultat est refusé et l'identité divergente n'est pas adoptée

### Requirement: Routage des méthodes MCP CAB via Code Mode

Le helper `nativeCodingMandate` MUST distinguer les outils natifs OpenCode
write/edit/shell des méthodes MCP CAB. Après discovery `search` exacte,
`request_validation`, `broker_readiness`, `poll_approval`, `get_approval` et
`reject` MUST être appelés uniquement dans le wrapper Code Mode `execute` avec
le nom MCP découvert. Un catalogue sans entrée supérieure séparée MUST NOT
provoquer un nom deviné, un appel MCP direct, un repli shell ou une permission
supplémentaire.

#### Scenario: Méthode MCP découverte et appelée dans Code Mode

- **WHEN** la discovery complète retourne une méthode MCP CAB exacte et `execute` est disponible
- **THEN** le mandat indique d’appeler cette méthode dans Code Mode `execute` en conservant les gardes CAB existantes

#### Scenario: Méthode ou wrapper absent

- **WHEN** `search` ne retourne pas la méthode ou que le wrapper `execute` est indisponible
- **THEN** le mandat indique le blocage sans appeler un outil direct ni substituer shell ou une autre méthode

### Requirement: Instructions de routage MCP en Code Mode

Le broker MUST inclure dans le résultat MCP `initialize` des instructions
destinées à OpenCode Code Mode, précisant que les méthodes MCP CAB s'appellent
via `execute` avec le nom exact découvert par `search`, sans appel direct,
nom deviné ou repli shell. Ces instructions MUST NOT créer de décision, de
permission ou d'effet. Les clients MCP non OpenCode gardent leur contrat.

#### Scenario: Handshake OpenCode reçoit la route Code Mode

- **WHEN** OpenCode initialise le broker CAB
- **THEN** le résultat d'initialisation contient les instructions de routage Code Mode

#### Scenario: Appel destiné à un autre client MCP

- **WHEN** le broker est utilisé par un client MCP autre qu'OpenCode
- **THEN** le broker n'exige pas le wrapper Code Mode et conserve les outils et schémas actuels

### Requirement: Réponse de permission native dans la location ciblée

Le client MUST transmettre chaque réponse de permission native à l’API V2
avec le scope de location exact associé à la session et à la permission.
Il MUST conserver l’endpoint, la décision demandée et la vérification d’une
réponse HTTP 204. Il MUST refuser un scope invalide avant toute requête.
Un appel de réponse non confirmé MUST NOT être présenté comme une permission
consommée.

#### Scenario: Session dans une autre location

- **WHEN** la location de la session diffère de la location par défaut du client
- **THEN** le POST de réponse porte le scope de la location de la session
- **AND** la décision et l’endpoint V2 restent inchangés

#### Scenario: Réponse native non confirmée

- **WHEN** l’API ne confirme pas la réponse par HTTP 204
- **THEN** le client signale l’échec sans déclarer `once` consommée ni renvoyer
  automatiquement le POST

### Requirement: Contrôle des permissions natives par session

Le contrôleur MUST demander les permissions natives de la seule session dont
il vérifie l’inactivité. Les permissions d’autres sessions MUST NOT être
validées, examinées ou modifiées au cours de ce contrôle. Une permission en
attente de la session ciblée MUST continuer à bloquer la libération. Les
vérifications d’identité, d’inactivité et de preuve native de la cible MUST
rester en vigueur.

#### Scenario: Permission étrangère mal formée

- **WHEN** une permission étrangère est mal formée et le contrôleur vérifie une autre session
- **THEN** la permission étrangère n’est ni lue ni modifiée et ne bloque pas la libération de l’accès ciblé

#### Scenario: Permission de la session ciblée

- **WHEN** la session contrôlée possède une permission native en attente
- **THEN** le contrôleur refuse la libération avec le blocage existant de session non inactive

### Requirement: Réconciliation d’une validation annulée par OpenCode

Le contrôleur MAY clore une validation PREPARED sans décision ou approuvée non consommée sur preuve native CANCELLED/OC. Il MUST vérifier identité exacte, double lecture stable, session inactive et absence de permission, entrée native et accès lié. Il MUST conserver la décision historique, persister CANCELLED et sa preuve, retirer toute réponse exécutable et ne créer aucun once. Une divergence MUST préserver les protections ; une fin native MUST déclencher la vérification.

#### Scenario: Annulation OpenCode stable sans effet

- **WHEN** la demande exacte est terminale CANCELLED par OpenCode et deux lectures natives identiques prouvent l’identité exacte, session idle et absence d’effet
- **THEN** l’opération devient CANCELLED sans créer de décision, accès ou permission et le RUN peut préparer une autre demande distincte

#### Scenario: Approbation locale non consommée annulée

- **GIVEN** une décision approved historique, une opération PREPARED sans entrée native ni accès
- **WHEN** une preuve CANCELLED/OC exacte et stable est qualifiée sur fin native ou après reconnexion
- **THEN** CAB conserve approved dans le ledger, clôt CANCELLED et retire la réponse exécutable, y compris après un autre redémarrage

#### Scenario: Annulation divergente ou frontière native active

- **WHEN** l’identité, le transcript, la session, la permission ou l’état de l’opération diverge ou reste actif
- **THEN** CAB conserve l’état protégé sans libérer de ressource ni créer de décision

#### Scenario: Attente métier d’un autre RUN

- **GIVEN** une infrastructure native joignable et une readiness BLOCKED due à une décision en attente
- **WHEN** l’annulation exacte d’une opération PREPARED sans effet est qualifiée
- **THEN** CAB peut clôturer cette annulation sans décision de substitution ni permission, en conservant les autres protections

### Requirement: Annulation exacte d’une validation imbriquée sous Code Mode

CAB MUST corréler une demande native unique et son annulation CANCELLED/OC exacte. Le wrapper MUST conserver découverte littérale puis cancel unique, arguments/identités et retour direct. Les blancs légaux hors chaînes MAY varier, sans changer tokens ou données. Double transcript, SID idle, zéro permission/accès restent requis ; aucune décision/once créée. Les diagnostics MCP prouvés sans effet MAY être ignorés comme observations, jamais utilisés comme preuve d’annulation.

#### Scenario: Wrapper Code Mode d’annulation terminale
- **WHEN** un wrapper complet non tronqué lie la demande exacte à search puis cancel_approval unique et retourne CANCELLED/OC avec toutes ses identités
- **THEN** CAB clôt la même opération sans décision, permission ou accès

#### Scenario: Mise en forme sans changement de programme
- **WHEN** espaces, tabulations ou sauts de ligne légaux hors chaînes changent sans modifier les tokens du gabarit fermé, les identifiants ou les arguments
- **THEN** CAB accepte la même preuve sans réexécuter le wrapper ni l’annulation
- **AND** les sauts de ligne après return/throw, commentaires, code ajouté ou fusion de mots restent refusés

#### Scenario: Diagnostics sans autorité avant l’annulation
- **GIVEN** un wrapper diagnostic terminé executed=false, non tronqué, avec liste non vide de calls complets limitée à search/get_approval/poll_approval/lookup_validation/broker_health/broker_readiness
- **WHEN** le transcript comporte aussi le wrapper d’annulation exact
- **THEN** CAB traite le diagnostic comme observation sans effet, sans en déduire une autorisation ou une annulation
- **AND** request_validation, cancel_approval, reject et outils mutateurs ne sont pas ignorés par cette classification

#### Scenario: Lecture terminale historique sans nouvelle annulation
- **WHEN** une lecture get_approval ou poll_approval seule expose le terminal CANCELLED/OC exact déjà acquis
- **THEN** la voie de preuve existante reste disponible sous ses contrôles de corrélation et quiescence, sans nouveau cancel

#### Scenario: Wrapper ambigu ou effet possible
- **WHEN** le wrapper est opaque, vide de métadonnées de calls, tronqué, exécuté=true, ajoute un appel ou une instruction, ou si identité/transcript/session/permission/opération diverge
- **THEN** CAB conserve l’opération protégée et n’émet aucune décision

### Requirement: Location explicite de l’historique des messages

Le client MUST transmettre `x-opencode-directory` avec la location explicite
reçue par `messages(sessionId, directory)` pour chaque page de l’historique.
Il MUST NOT utiliser la location par défaut du client quand un répertoire de
session est fourni. Le contrôle s’applique aussi aux pages suivantes après
chaque curseur.

#### Scenario: Historique paginé d’une session dans une autre location

- **WHEN** le client lit plusieurs pages d’une session dont le répertoire diffère de sa location par défaut
- **THEN** chaque requête de message cible le répertoire explicite de cette session

### Requirement: Binding strict d’une commande JSON dans Code Mode

Le client MUST pouvoir lier une commande littérale déclarée à une propriété
`commands` unique dans un objet `request_validation` Code Mode, que la clé soit
écrite en syntaxe JavaScript non quotée ou JSON quotée. L’élément lié MUST être
l’identifiant exact de la déclaration et MUST être remplacé par sa valeur
littérale échappée avant la comparaison avec l’appel MCP natif. Une clé
dupliquée, une valeur différente ou une expression dynamique MUST conserver le
wrapper `execute` bloquant.

#### Scenario: Clé JSON quotée et commande littérale

- **WHEN** un wrapper complet et non exécuté déclare une commande littérale puis l’utilise comme unique entrée de `"commands"` et correspond à l’appel MCP natif
- **THEN** CAB normalise l’appel en conservant son entrée exacte et sa preuve native

#### Scenario: Propriété dupliquée ou binding divergent

- **WHEN** plusieurs propriétés `commands` existent, la variable diffère de la déclaration ou l’entrée est dynamique
- **THEN** CAB conserve le wrapper `execute` non normalisé et n’admet aucune validation

### Requirement: Corrélation d’un shell natif background

CAB MAY accepter background=true uniquement pour un shell déclaré par
shell_background=true, avec once, tool_input_sha256 concordant, timeout positif
et port write réservé. Le shellID MUST venir du call natif lié à la session.
Le GET shell MUST vérifier id, location, commande, cwd et dates. Shell.Info
ne fournissant pas de session obligatoire, la liaison MUST venir de la chaîne
native, jamais d’un champ inventé.

#### Scenario: Start background natif corrélé

- **WHEN** la partie native approuvée fournit shellID et que GET shell retourne cet id, la commande, la location, le cwd et les dates concordants
- **THEN** CAB conserve la corrélation du processus sans traiter le lancement comme sa fin

### Requirement: Fin native d’un serveur background

Le verrou de ressource MUST rester détenu jusqu’à ce que `GET /api/shell/:id` ou
`shell.exited` fournisse un statut terminal corrélé au shellID et au start.
Un timeout sans shellID, un port fermé, l’absence d’une ligne dans `GET /api/shell`
ou une session idle MUST NOT prouver la fin d’une opération existante.

#### Scenario: Processus encore en cours

- **WHEN** le shell corrélé répond `status=running`
- **THEN** CAB garde l’accès du port et laisse progresser seulement les accès disjoints

#### Scenario: Timeout foreground historique sans shellID

- **WHEN** un appel foreground a `metadata.timeout=true` mais aucun shellID/exit corrélable
- **THEN** CAB conserve l’opération et l’accès `EXECUTING` sans `NO_EFFECT`, rejeu ou réattribution

#### Scenario: GET shell indisponible ou divergent

- **WHEN** la lecture du shell échoue, retourne 404, ou change session, commande, cwd, id ou révision
- **THEN** CAB garde les protections et ne clôt aucun accès

### Requirement: Pagination adaptative locale à une page native

Une réduction de page pour dépassement de taille MUST rester au même curseur et MUST NOT réduire toutes les pages suivantes. Le client MUST rétablir sa taille nominale au curseur suivant, préserver les plafonds de réponse et de pages et refuser les cycles, réponses invalides ou dépassements sans retourner un transcript partiel.

#### Scenario: Grande page puis historique ordinaire

- **WHEN** la première page nécessite une taille de 1 et que les suivantes sont petites
- **THEN** le client reprend la taille nominale et retourne l’ensemble complet sans fausse limite de pagination

### Requirement: Snapshot natif partagé dans une passe de réconciliation

Le contrôleur MAY réutiliser une lecture native pour une même session et génération pendant une seule passe. Il MUST invalider cette réutilisation après un événement natif et MUST conserver une seconde lecture indépendante et stable avant une clôture terminale. Un échec partagé MUST NOT devenir une preuve ni bloquer les RUN disjoints.

#### Scenario: Plusieurs validations de la même session

- **WHEN** une passe inspecte plusieurs opérations sans événement natif intermédiaire
- **THEN** l’historique initial est lu une fois et chaque clôture conserve sa vérification indépendante

### Requirement: Reçu durable d’un refus natif programmatique

Le client CAB MUST conserver pour reject une intention privée avant POST et un ACK après HTTP204, avec identités natives et digests sans commandes ni secrets. Une intention sans ACK MUST rester indéterminée et MUST NOT rejouer le POST. Une réponse déjà confirmée MAY être relue sans effet. Un échec de journalisation après ACK MUST distinguer la réponse confirmée de sa persistance manquante.

#### Scenario: Réponse perdue après un refus
- **WHEN** un ACK durable existe pour la même permission et le même scope
- **THEN** sa relecture ne renvoie aucune nouvelle réponse native

#### Scenario: Intention seule après crash
- **WHEN** le journal contient l’intention sans confirmation
- **THEN** le client expose l’issue indéterminée sans second POST

### Requirement: Préambule search attendu avant validation littérale
Le client MUST reconnaître await optionnel dans le binding const de search
qualifié précédant un retour MCP direct et littéral. Une validation running
MAY être projetée avant les metadata finales, selon les gardes existantes.
Les entrées observées complètes MUST rester strictement concordantes ; aucun
code supplémentaire, appel dynamique ou effet natif ne MUST être accepté.

#### Scenario: Validation bloquante après search attendu
- **WHEN** un wrapper running emploie const schema = await search avec arguments littéraux puis retourne request_validation littéral
- **THEN** son identité est corrélable sans attendre le timeout du call MCP ni un poll de rattrapage

#### Scenario: Metadata divergente ou suffixe supplémentaire
- **WHEN** l’entrée native diffère, est tronquée ou le wrapper ajoute une instruction non qualifiée
- **THEN** le wrapper reste opaque et aucune permission ou identité ne peut être inventée

### Requirement: Assertion littérale du chemin de discovery
Le client MAY qualifier après search une unique assertion comparant
variable.items[0].path par !== à un chemin littéral, suivie de throw new
Error avec message littéral. Le chemin MUST être celui du retour MCP exact
qui suit ; variable et suffixe MUST rester liés à la grammaire qualifiée.
Toute autre logique MUST conserver le wrapper opaque.

#### Scenario: Signature vérifiée avant requête bloquante
- **WHEN** un wrapper running vérifie le chemin fixe request_validation sur sa discovery puis retourne ce call avec arguments littéraux
- **THEN** son identité peut être projetée sans attendre la metadata finale, sans décision ni permission implicite

#### Scenario: Assertion étrangère, dynamique ou code supplémentaire
- **WHEN** la variable, l’index, le chemin, Error ou le suffixe diffère de la forme qualifiée
- **THEN** le wrapper reste opaque et aucune preuve ou autorisation n’est inventée

### Requirement: ASK effectif et grants natifs sauvegardés
Le client SHALL distinguer règles ASK déclarées et grants sauvegardés du projet. Avant prompt de codage, décision positive ou once, il SHALL vérifier les deux et refuser si un grant couvre une action protégée, si le projet diverge ou si l’audit est indisponible. Les ressources des grants SHALL rester locales et ne pas être exposées dans le diagnostic. always SHALL être refusé par le client CAB. Un audit ne SHALL modifier aucune règle ni session.

#### Scenario: Grant node persistant malgré ASK nominal
- **GIVEN** shell ask déclaré et un grant shell sauvegardé du même projet
- **WHEN** un mandat natif permissionné est préparé ou une once est envisagée
- **THEN** l’audit déclare nominalReady mais ready false et bloque avant émission
- **AND** le contenu du grant n’est pas exposé au LLM

#### Scenario: Audit manquant ou projet divergent
- **WHEN** le service saved échoue ou le SID/répertoire/projet ne peut être lié
- **THEN** le contrôle reste fermé sans prompt, décision positive ou once

### Requirement: Révocation native sous maintenance partagée
Une autorité de maintenance partagée explicite SHALL pouvoir préparer puis appliquer un plan borné aux grants protégés du projet exact. PID/version, politique déclarée, empreintes des entrées, frontière inactive sans permission et autorité liée au plan SHALL être vérifiés. L’intention SHALL être persistée avant DELETE. Autres actions/projets, sessions, RUN et baux SHALL rester inchangés. La fin SHALL exiger l’absence des grants ciblés et un audit ASK prêt, sans rollback vers always.

#### Scenario: Révocation ciblée et conservation
- **GIVEN** un plan exact, une autorité partagée applicable et une frontière native inactive
- **WHEN** les grants protégés sont révoqués via leur API officielle
- **THEN** read/external et autres projets restent intacts, ASK est réaudité et le reçu privé devient terminal

#### Scenario: Autorité ou frontière non qualifiée
- **WHEN** l’autorité manque, un processus/projet/politique change, une session est active, une permission pend ou une entrée hors plan apparaît
- **THEN** aucune nouvelle suppression n’est envoyée et les preuves acquises restent conservées

#### Scenario: Réponse perdue ou reprise
- **WHEN** DELETE perd sa réponse mais l’entrée est absente dans une observation autoritaire
- **THEN** le reçu distingue absence observée et ACK, sans rejouer une commande native
- **AND** une reprise du même plan reste idempotente et bornée sur les mêmes IDs immuables

### Requirement: Accord permanent de restauration native ASK
Le protocole SHALL appliquer l’accord permanent du développeur du4novembre2026 à la révocation API bornée des grants protégés restaurant ASK déclaré du projet natif exact, sans sollicitation répétée des sessions. L’orchestrateur SHALL lier cette autorité au plan et conserver toutes les gardes de maintenance, identités et protections. Audit et CABU SHALL rester sans révocation implicite.

#### Scenario: Plusieurs sessions du même projet affectées
- **GIVEN** un accord permanent applicable et des grants protégés identifiés par plan exact
- **WHEN** plusieurs sessions signalent ASK nominal mais non effectif
- **THEN** le correcteur coordonne une seule maintenance sous cet accord sans nouveau formulaire humain par session
- **AND** les grants et projets hors cible, règles, processus, sessions, RUN, accès et baux restent conservés

#### Scenario: Frontière active ou plan divergent
- **WHEN** une session native reste active, une permission pend ou une empreinte diverge
- **THEN** le plan s’arrête avant la suppression suivante sans forçage ni consentement inventé
- **AND** l’orchestrateur coordonne une frontière naturelle ou diagnostique un plan actualisé dans la même classe autorisée

### Requirement: Liste des validations délimitée et paginée
Le broker SHALL accepter les filtres exacts run_id et session_id et paginer les résultats après filtrage. Il SHALL préserver le comportement sans filtre et les contrôles d’expiration existants. Un filtre invalide SHALL être refusé. Aucun contenu d’un autre RUN ou SID SHALL être inclus dans une réponse filtrée.

#### Scenario: Validations de plusieurs RUN
- **WHEN** une liste est demandée avec un RUN et un SID
- **THEN** seules leurs validations sont retournées et le nombre reflète ce périmètre

#### Scenario: Résultats au-delà de la première page
- **WHEN** le nombre de validations filtrées dépasse la limite
- **THEN** les pages suivantes permettent de retrouver les autres validations sans divulguer de pair

### Requirement: Corrélation shell native à ressources multiples
Le client SHALL vérifier le SID, le message et l’identifiant du call source unique. Pour plusieurs ressources, elles SHALL couvrir dans l’ordre et littéralement la commande native entière, les seuls séparateurs tolérés étant des opérateurs ou espaces shell. L’empreinte SHALL couvrir l’entrée native complète. Toute couverture absente, ambiguë ou divergente SHALL être refusée sans réponse à la permission.

#### Scenario: Commande composée exactement couverte
- **WHEN** les ressources de la permission correspondent aux segments ordonnés de la commande source exacte
- **THEN** le client retourne la commande entière et l’empreinte de son entrée native

#### Scenario: Ressource différente ou commande incomplète
- **WHEN** un segment est absent, modifié ou que du texte non couvert subsiste
- **THEN** le client refuse la corrélation et ne répond pas à la permission

### Requirement: Observation native convergente
Le job SHALL éviter les observations simultanées et ne SHALL NOT répéter un diagnostic identique à chaque cadence. Une observation ultérieure réussie SHALL permettre la convergence normale ; une erreur SHALL conserver les protections et SHALL NOT autoriser un effet.

#### Scenario: Erreur persistante puis rétablissement
- **WHEN** une erreur identique persiste puis une observation réussit
- **THEN** un diagnostic initial est conservé et la cadence converge sans rejeu ni acquittement implicite

### Requirement: Interdire once pour une permission shell décomposée
Une permission shell native portant plusieurs ressources SHALL rester observable après corrélation de sa source, mais SHALL NOT correspondre à une opération approuvable ni recevoir once. La voie de rejet propriétaire journalisée SHALL rester disponible et les autres permissions SHALL conserver leurs protections.

#### Scenario: Commande composée exactement observée
- **WHEN** une permission à plusieurs ressources couvre la commande native
- **THEN** elle est visible pour diagnostic et refusée pour l’admission once

#### Scenario: Rejet propriétaire
- **WHEN** le propriétaire rejette la permission sous les gardes applicables
- **THEN** le rejet reste traçable sans émission once ni décision inventée

### Requirement: Continuité après redémarrage imprévu
Lorsqu'OpenCode est redémarré, CAB SHALL vérifier l'identité de la nouvelle instance, la disparition de l'ancienne et le workspace avant de rétablir les communications. CAB SHALL vérifier les sessions persistantes et les frontières natives avant toute reprise. Un changement de PID seul SHALL NOT prouver l'identité d'une session ou la fin d'un effet.

#### Scenario: Nouvelle instance et session persistante vérifiées
- **WHEN** l'ancienne instance a disparu et la nouvelle instance et la session du même workspace sont vérifiées
- **THEN** CAB rétablit la communication et engage la réconciliation du RUN sans recréer sa session ni rejouer d'effet

#### Scenario: Identité ou effet incertain
- **WHEN** la nouvelle identité, la session ou la fin d'un effet ne peut pas être prouvée
- **THEN** CAB conserve les protections concernées et expose le diagnostic sans empêcher les RUN indépendants vérifiés

### Requirement: Réconciliation des protections après redémarrage
CAB SHALL réconcilier les accès et baux restaurés lorsque leur propriétaire, leur identité et leur frontière native sont vérifiés. Les ressources SHALL rester protégées tant que leur état est incertain. Aucun nouveau test, commande ou permission SHALL être rejoué par la réconciliation.

#### Scenario: Bail restauré et frontière quiescente
- **WHEN** le bail propriétaire et les deux observations natives concordent et ne révèlent aucun effet incertain
- **THEN** la réconciliation conserve ce bail et permet la poursuite du RUN sans nouvelle allocation

### Requirement: Documentation exacte du digest natif write

Le protocole MUST documenter le schéma natif write et le calcul de `tool_input_sha256` par le calculateur distribué, y compris la sérialisation JavaScript compacte et l’absence de normalisation du contenu. Un vecteur synthétique MUST permettre de vérifier le résultat sans exposer de données projet.

#### Scenario: Argument write avec retour à la ligne et Unicode
- **WHEN** le propriétaire calcule le digest à partir de l’objet natif complet
- **THEN** le résultat correspond au calculateur distribué et distingue les octets de contenu modifiés

#### Scenario: Digest historique divergent
- **WHEN** l’objet source de ce digest n’est pas prouvé
- **THEN** le protocole ne déduit pas sa cause et ne l’utilise pas comme autorisation
