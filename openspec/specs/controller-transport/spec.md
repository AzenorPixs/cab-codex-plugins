# controller-transport Specification

## Purpose
Cette capacité définit le contrôleur CGPT local qui relaie une demande du broker vers CGPT et restitue une décision corrélée.

## Requirements

### Requirement: Interface locale limitée
Le contrôleur SHALL écouter uniquement sur `127.0.0.1` ou `::1`, par défaut
`127.0.0.1`, et SHALL conserver MCP hors de son interface HTTP. Il SHALL
exiger une exécution explicitement déclarée hors sandbox et un workspace de
projet absolu fourni au démarrage. Il SHALL NOT contenir de liste codée en dur
de projets pilotés.

#### Scenario: Démarrage sans autorisation hors sandbox
- **WHEN** le contrôleur démarre sans `OC_Codex_OUTSIDE_SANDBOX=1`
- **THEN** il échoue avant d'ouvrir son interface locale

#### Scenario: Hôte non local refusé
- **WHEN** `OC_Codex_STATUS_HOST` contient une adresse autre que `127.0.0.1` ou `::1`
- **THEN** le contrôleur échoue avant d'ouvrir son interface locale

#### Scenario: Workspace non autorisé refusé
- **WHEN** `OC_Codex_WORKSPACE` est absent ou relatif
- **THEN** le contrôleur échoue avant de lancer Codex App Server

#### Scenario: Workspace absolu générique
- **WHEN** `OC_Codex_WORKSPACE` désigne une racine de projet absolue
- **THEN** le contrôleur l'accepte sans comporter de référence à un projet
  piloté particulier

### Requirement: Contrat HTTP de validation

Le contrôleur SHALL accepter une demande sur `POST /validation/request`, mémoriser une
décision explicite et unique sous le `requestId` de la demande, et la restituer par `GET
/decision/<requestId>`. Toute décision restituée SHALL inclure le même `requestId`,
l'`approval_id` et le `change_id` de la demande notifiée. Le contrôleur SHALL accepter
les décisions `approved`, `rejected` et `needs_clarification` et SHALL refuser une
seconde décision pour le même `requestId`.

#### Scenario: Décision manuelle valide
- **WHEN** une décision `needs_clarification` valide est envoyée sur `POST /decision/<requestId>` pour une demande notifiée en mode manuel
- **THEN** le contrôleur la mémorise une fois avec les identifiants de la demande et répond avec un statut HTTP de création

#### Scenario: Demande manuelle en attente
- **WHEN** une demande valide est envoyée sur `POST /validation/request` avec `OC_Codex_DECISION_MODE=manual`
- **THEN** le contrôleur répond PENDING sans démarrer de tour de décision Codex et `GET /decision/<requestId>` reste indisponible jusqu'à une décision corrélée

#### Scenario: Lecture corrélée d'une décision
- **WHEN** le broker appelle `GET /decision/<requestId>` après qu'une décision a été mémorisée
- **THEN** le contrôleur retourne cette décision et ses identifiants de corrélation sans la substituer par un `approval_id`

#### Scenario: Méthode non admise
- **WHEN** une méthode autre que GET ou POST cible `/decision/<requestId>`
- **THEN** le contrôleur répond HTTP 405

### Requirement: Statut de supervision
Le contrôleur SHALL exposer son état public sur `GET /status`, dont l'état du Codex App Server, du SSE OpenCode et la dernière readiness du broker.

#### Scenario: Lecture du statut
- **WHEN** un healthcheck appelle `GET /status`
- **THEN** il reçoit un objet JSON sans secret ni décision détaillée

### Requirement: Verrou de clôture de job corrélé

Le contrôleur SHALL exiger un gate terminal local avant toute clôture normale.
Il SHALL le refuser tant qu'une validation est active ou indécise localement,
qu'une demande broker est en attente ou qu'un état explicite `TERMINÉ` ou
`BLOQUÉ` manque. Un ancien compteur broker nul SHALL NOT remplacer une décision
locale absente. Le gate SHALL rester distinct des décisions et SHALL NOT
approuver une opération OpenCode.

#### Scenario: Clôture prématurée refusée
- **WHEN** une clôture est demandée alors qu'une validation est active ou en attente
- **THEN** le contrôleur la refuse, expose la raison sans secret et conserve le job ouvert

#### Scenario: Validation manuelle avec ancien compteur nul
- **WHEN** une demande manuelle locale reste sans décision et la dernière readiness indique pending_count zéro
- **THEN** le contrôleur refuse le gate et conserve la demande indécise

#### Scenario: Gate terminal valide
- **WHEN** une clôture normale est demandée avec un état terminal explicite et sans validation active ou en attente
- **THEN** le contrôleur confirme le gate terminal et rend son état observable

### Requirement: État terminal observable

Le contrôleur SHALL exposer sur `GET /status` un résumé non sensible du gate
terminal, comprenant son état, sa raison et l'état terminal déclaré. Une
attente, un silence SSE, un rapport intermédiaire ou la fin d'un tour Codex ne
SHALL jamais être interprété comme un état terminal.

#### Scenario: Jalon intermédiaire non terminal
- **WHEN** le contrôleur observe la fin d'un tour Codex sans état terminal déclaré
- **THEN** son statut indique que le gate terminal n'est pas validé

### Requirement: Corrélation sûre des commandes Bash instrumentées

Le contrôleur SHALL corréler une permission Bash à la commande approuvée lorsque
OpenCode y ajoute exclusivement une instrumentation de sortie déterministe connue. Le
contrôleur SHALL vérifier que la commande métier approuvée reste inchangée et SHALL
refuser toute transformation qui ajoute, retire ou modifie une opération métier. Une
permission corrélée SHALL rester consommable une seule fois.

#### Scenario: Commande exacte
- **WHEN** OpenCode demande une permission Bash dont la commande est identique
  à celle du mandat approuvé
- **THEN** le contrôleur la corrèle à ce mandat et peut transmettre une unique
  réponse `once` après une décision `approved`

#### Scenario: Instrumentation de sortie admise
- **WHEN** OpenCode ajoute uniquement l'instrumentation de sortie déterministe
  reconnue à la fin de la commande approuvée
- **THEN** le contrôleur corrèle la permission à la commande métier approuvée
  sans élargir la portée du mandat

#### Scenario: Transformation métier refusée
- **WHEN** la commande de permission diffère de la commande approuvée autrement
  que par l'instrumentation de sortie reconnue
- **THEN** le contrôleur ne la corrèle pas et ne transmet aucune réponse de
  permission

#### Scenario: Suffixe refusé pour un job strict
- **WHEN** un job déclare `strictCommands: true` et OpenCode ajoute un suffixe,
  y compris l'instrumentation de sortie reconnue, à une commande approuvée de
  la même session et du même répertoire
- **THEN** le contrôleur ne corrèle pas cette permission et ne transmet aucune
  réponse `once`

#### Scenario: Commande exacte consommée une fois pour un job strict
- **WHEN** un job déclare `strictCommands: true` et OpenCode demande une
  permission dont la commande est strictement identique au mandat approuvé
- **THEN** le contrôleur peut transmettre une seule réponse `once` à cette
  permission et ne réutilise pas la décision pour une seconde permission

### Requirement: Réveil corrélé de l'orchestrateur

Le contrôleur SHALL accepter une relance corrélée sur une interface HTTP locale et
vérifier son `requestId`, son `approval_id` et son `change_id` avant toute action. Pour
une relance valide sans décision terminale en mode manuel, le contrôleur SHALL signaler
le rappel corrélé dans son statut sans créer de thread ni de tour Codex App Server.
Cette protection SHALL s'appliquer également aux heartbeats de relance.

#### Scenario: Rappels manuels répétés
- **WHEN** le contrôleur reçoit plusieurs relances corrélées d'une demande
  sans décision avec `OC_Codex_DECISION_MODE=manual`
- **THEN** il retourne une réponse non décisionnelle, rend le rappel observable
  et ne lance aucun `thread/start` ni `turn/start`
- **AND** `GET /decision/<requestId>` reste indisponible

#### Scenario: Décision explicite après un rappel manuel
- **WHEN** l'orchestrateur principal publie une décision valide sur
  `POST /decision/<requestId>` après un rappel manuel
- **THEN** le contrôleur mémorise cette décision une seule fois avec les
  identifiants de la demande
- **AND** une seconde décision ou une relance terminale est refusée

#### Scenario: Événement structuré transmis
- **WHEN** le contrôleur reçoit une relance corrélée en mode automatique et
  sa tâche orchestratrice persistante est disponible
- **THEN** il transmet `requestId`, `change_id`, session OpenCode, âge,
  opération et dernier état connu sans créer de décision

#### Scenario: Réveil indisponible
- **WHEN** le contrôleur en mode automatique ne peut pas transmettre
  l'événement ni planifier son heartbeat
- **THEN** il conserve une notification locale persistante pour
  l'orchestrateur et retourne un état de relance non décisionnel

### Requirement: Contrat de supervision de job local

Le contrôleur SHALL accepter et exposer exclusivement sur son interface locale un
contrat de supervision de job non secret, corrélé à une session OpenCode et à son gate
terminal. Le contrôleur SHALL refuser un contrat incomplet, une substitution implicite
de session sur /job/arm, ou une désactivation sans gate terminal validé. Seule la
récupération explicite /job/recover définie ci-dessous MAY remplacer la session.

#### Scenario: Tentative de désarmement prématuré

- **WHEN** un client demande le désarmement d'un job dont le gate terminal est
  ouvert
- **THEN** le contrôleur refuse la demande et conserve le contrat observable

#### Scenario: Type invalide pour la corrélation stricte
- **WHEN** un client arme un job avec une valeur non booléenne de
  `strictCommands`
- **THEN** le contrôleur refuse le contrat et ne l'arme pas

### Requirement: Interface explicite de récupération
POST /job/recover MUST accepter prepare, retry, reconcile et complete, corrélés par jobId, expectedSessionId, sessionId, recoveryId et preflightRequestId uniques. Le contrôleur MUST refuser les mutations concurrentes pendant la transition. Il MUST NOT désarmer le job, purger le RUN, fabriquer une décision ou valider le gate pour ce remplacement.

#### Scenario: Transition concurrente
- **WHEN** une mutation est demandée pendant un contrôle asynchrone de récupération
- **THEN** elle est refusée sans modifier le contrat

### Requirement: Préconditions techniques de récupération
prepare, retry et complete MUST vérifier un job armé, son gate OPEN, le mandat courant clôturé et l’absence de demande indécise, rappel, permission native ou transmission en cours. Ils MUST vérifier par l’API V2 authentifiée la location cible, la majeure 2 de `/api/info`, le MCP connecté, les sessions inactives et l’absence de permissions natives. Toute observation indisponible, non authentifiée ou divergente MUST refuser la transition sans repli V1.

#### Scenario: Précondition manquante
- **WHEN** une permission, une session occupée, une demande indécise ou un contexte divergent est observé
- **THEN** la transition est refusée sans transfert ni approbation implicite

#### Scenario: Réconciliation héritée sans preuve V2
- **WHEN** la récupération historique cherche une preuve fondée sur le champ `tools` d'un message utilisateur et que le transcript V2 ne l'expose pas
- **THEN** CAB refuse la réconciliation avec une erreur explicite, conserve le job et n'infère ni autorisation ni exécution native

Les métadonnées V2 arbitraires MUST NOT être interprétées comme le champ V1 `tools`.

### Requirement: Gel et persistance de récupération
prepare MUST persister un gel observable sans contenu de projet ni secret et invalider les autorisations exécutables de l'ancienne session sans modifier les décisions historiques. Le gel et les sessions révoquées MUST survivre à un redémarrage. Un échec de complete MUST conserver le gel.

#### Scenario: Redémarrage pendant une récupération
- **WHEN** le contrôleur redémarre après prepare et avant complete
- **THEN** le gel est restauré et aucune ancienne autorisation n'est exécutée

### Requirement: Prévol natif avant transfert
complete MUST exiger une décision locale approved, une réponse MCP APPROVED corrélée au preflightRequestId réservé, une unique permission /usr/bin/true consommée et une commande exacte terminée exit 0. Les messages natifs OpenCode MUST ensuite prouver broker_readiness READY pending_count 0. Une affirmation du client, une preuve absente ou divergente, ou un autre outil natif exécuté MUST refuser le transfert.

#### Scenario: Polling corrélé après délai MCP
- **WHEN** request_validation expire côté client et poll_approval ou get_approval retourne une réponse APPROVED réellement corrélée avant la commande
- **THEN** complete MAY accepter cette réponse native après vérification de toutes les autres preuves

#### Scenario: Prévol non prouvé
- **WHEN** le client affirme une réussite mais les messages natifs ne la prouvent pas
- **THEN** complete refuse le transfert et conserve le gel

### Requirement: Frontière des diagnostics de préparation
prepare MUST persister count et empreinte des seules parties MCP diagnostiques ou de réconciliation technique déjà présentes dans la candidate. complete MUST vérifier ce préfixe intact avant le prévol. Aucun outil natif ni approve/reject ne peut être masqué. Pour une récupération héritée, seuls les diagnostics terminés avant preparedAt et avant la demande réservée MAY être exclus ; l'historique complet reste conservé.

#### Scenario: Diagnostics puis prévol strict
- **WHEN** des diagnostics techniques précèdent prepare puis un prévol conforme suit la frontière
- **THEN** complete vérifie l'historique intact sans compter ces diagnostics comme effets natifs

### Requirement: Autorisation de reprise humaine attestée
complete MAY recevoir restoredPreflightProof uniquement avec developerAuthorization spécifique, pour le même job désarmé avec gate persistant VALIDATED/BLOQUÉ postérieur au prévol et candidate non révoquée. Ce gate atteste la consommation préalable ; une affirmation de consommation seule MUST NOT suffire. Toutes les autres préconditions techniques restent obligatoires.

#### Scenario: Gate absent ou différent
- **WHEN** le gate attestant la consommation manque ou sa référence diverge
- **THEN** complete refuse sans réarmer ni transférer

### Requirement: Preuves strictes de restauration humaine
La reprise humaine MUST vérifier empreinte canonique du préfixe natif, décision originale, identités, réponse APPROVED avec reviewer CGPT, absence de tools.bash=true pendant le prévol, commande exacte exit 0 et READY sans attente après la commande. Toute preuve absente ou divergente MUST conserver le gel, le job et les décisions.

#### Scenario: Preuve native divergente
- **WHEN** l'empreinte, la décision, l'identité, la commande, l'attestation de consommation ou la readiness manque ou diverge
- **THEN** complete refuse sans restaurer de décision ni accorder de permission

### Requirement: Restauration consommée sans rejeu
Après preuves, la reprise humaine MUST réarmer seulement le même job, restaurer sa décision corrélée comme déjà consommée, persister références et empreintes d'audit puis effectuer le transfert normal avec gate OPEN. Elle MUST NOT transmettre once, exécuter une commande, modifier les messages natifs ou assouplir retry/reconcile.

#### Scenario: Maintenance et reprise autorisées
- **WHEN** le développeur autorise la reprise du même job désarmé et que le prévol déjà consommé est intégralement prouvé
- **THEN** complete restaure ces preuves comme consommées et transfère la candidate sans nouvelle permission ni rejeu

### Requirement: Conservation du même job
Après complete, le contrôleur MUST conserver jobId, directory, changeId, criteria, lastProvenMilestone et strictCommands, remplacer uniquement la session, persister l'historique non secret des récupérations et conserver gate OPEN. Les sessions révoquées MUST rester sans permission exécutable même après désarmement.

#### Scenario: Transfert prouvé
- **WHEN** les préconditions et le prévol sont prouvés
- **THEN** complete remplace la session et conserve le périmètre, le dernier jalon et le gate OPEN

### Requirement: Session admise pour les validations
Pour un job armé, le contrôleur MUST refuser toute nouvelle validation dont la session ou directory diverge du contrat. Pendant la récupération, il MUST admettre uniquement le preflightRequestId réservé, files vide et commands contenant /usr/bin/true seul, dans la session candidate et directory du job.

#### Scenario: Mauvaise session
- **WHEN** une demande vise une session ou un répertoire non admis
- **THEN** le contrôleur refuse la validation sans décision ni permission

### Requirement: Prévol strict et autorisations invalidées
La commande réservée MUST être corrélée exactement sans suffixe, quelle que soit strictCommands, et nécessiter une décision explicite unique. Une décision consommée ou invalidée MUST NOT répondre once de nouveau ; la décision historique MUST rester inchangée.

#### Scenario: Suffixe ou ancienne décision
- **WHEN** une permission ajoute un suffixe au prévol ou vise une autorisation invalidée de l'ancienne session
- **THEN** aucune permission once n'est transmise

### Requirement: Restauration explicite du job au démarrage

Le contrôleur MUST valider puis restaurer le contrat persistant selon les
formats supportés. La racine MUST être un objet JSON non nul, distinct d'un
tableau, avec les champs obligatoires et types attendus. Seul ENOENT MAY
permettre un démarrage sans job. La restauration valide MUST préserver
jalons, gate et métadonnées de récupération sans les réinitialiser.

#### Scenario: Fichier absent
- **WHEN** le fichier de contrat est absent
- **THEN** le contrôleur peut démarrer sans job enregistré

#### Scenario: Contrat valide
- **WHEN** le fichier contient un contrat valide avec un gate ouvert et des métadonnées de récupération
- **THEN** le contrôleur restaure ce contrat sans inventer de jalon ni d'état terminal

#### Scenario: Racine JSON invalide pour un contrat
- **WHEN** le fichier contient null, un booléen, un nombre, une chaîne ou un tableau JSON
- **THEN** le contrôleur refuse la restauration sans assimiler ce contenu à un fichier absent

#### Scenario: Objet incomplet ou types invalides
- **WHEN** un objet JSON omet un champ obligatoire du format supporté ou présente un type incompatible
- **THEN** le contrôleur refuse la restauration sans réparer le contrat

#### Scenario: Format historique supporté
- **WHEN** un contrat valide d'un format supporté omet un champ historiquement facultatif
- **THEN** le contrôleur conserve sa compatibilité et ne réinitialise pas ses jalons, son gate ou ses preuves

### Requirement: Refus des erreurs de restauration du job

Un JSON malformé, un contrat invalide ou une erreur de lecture autre que
ENOENT MUST arrêter le démarrage avec un code non nul avant HTTP et toute
interaction OpenCode ou Codex App Server. Le fichier persistant MUST rester
inchangé, sans suppression ni réparation automatique.

#### Scenario: JSON malformé
- **WHEN** le fichier de contrat ne peut pas être décodé comme JSON
- **THEN** le contrôleur échoue au démarrage sans interaction externe et conserve le fichier intact

#### Scenario: Erreur de lecture
- **WHEN** la lecture du fichier de contrat échoue avec une erreur autre que ENOENT
- **THEN** le contrôleur échoue au démarrage sans assimiler cette erreur à un job absent

#### Scenario: Contrat décodé mais invalide
- **WHEN** le JSON est décodé mais sa structure ne satisfait pas le format de contrat supporté
- **THEN** le contrôleur échoue avant toute interface ou interaction externe et conserve le fichier intact

### Requirement: Diagnostic de restauration sans contenu persistant

Un refus de restauration MUST distinguer JSON malformé, lecture impossible
et contrat invalide. Le diagnostic MUST NOT reprendre le contenu persistant,
le message brut de l'exception ou le chemin runtime.

#### Scenario: Contenu non exposé
- **WHEN** un contrat malformé contient un marqueur synthétique
- **THEN** le diagnostic identifie l'échec de décodage sans afficher ce marqueur ni le chemin runtime

#### Scenario: Contrat invalide non divulgué
- **WHEN** un objet de contrat invalide contient un marqueur synthétique
- **THEN** le diagnostic indique un contrat invalide sans exposer le marqueur, le chemin ou l'exception brute

### Requirement: URL du contrôleur compatible entre clients locaux
Le superviseur et le healthcheck SHALL accepter `OC_Codex_CONTROLLER_URL`
comme base HTTP ou comme endpoint `/status`, avec slash final facultatif.
Ils SHALL résoudre `/status` une seule fois ; le superviseur SHALL retrouver
la base pour `/job`. Les valeurs par défaut et les alias `OC_CGPT_` SHALL
rester compatibles, sans nouveau paramètre.

#### Scenario: Base HTTP fournie
- **WHEN** la variable contient la base du contrôleur
- **THEN** les deux clients interrogent son endpoint /status et le superviseur interroge /job

#### Scenario: Endpoint de statut fourni
- **WHEN** la variable contient l'endpoint /status, avec ou sans slash final
- **THEN** aucun client n'ajoute un second /status et le superviseur interroge /job depuis la base

#### Scenario: Alias historique ou valeur par défaut
- **WHEN** l'alias OC_CGPT_CONTROLLER_URL est utilisé ou aucune URL n'est fournie
- **THEN** les clients conservent ces modes de configuration et les mêmes endpoints

### Requirement: Retry explicite dans la candidate conservée
retry MUST conserver jobId, expectedSessionId, sessionId et recoveryId. Il MUST exiger previousPreflightRequestId égal à la réservation courante et preflightRequestId inédit. Il MUST conserver gel, gate, jalons et critères, réserver seulement le nouvel essai et persister son historique sans modifier les décisions antérieures.

#### Scenario: Identité périmée ou session différente
- **WHEN** retry réutilise un identifiant, change de session ou présente une réservation périmée
- **THEN** le contrôleur refuse sans changer le job

### Requirement: Refus natif sans effet avant retry
retry MUST vérifier les préconditions techniques et le refus sans consommation de chaque demande enregistrée de la tentative précédente. Il MUST accepter REJECTED direct ou obtenu par poll_approval/get_approval corrélé après timeout MCP, avec décision locale rejected non consommée. Un délai seul, une preuve absente/divergente, approved, une commande ou un autre outil natif MUST refuser retry. Les preuves historiques MUST rester intactes.

#### Scenario: Refus enregistré
- **WHEN** une réponse native REJECTED correspond à une décision locale rejected non consommée
- **THEN** retry MAY réserver un essai neuf dans la même candidate après réconciliation

#### Scenario: Refus obtenu après timeout
- **WHEN** request_validation expire puis poll_approval ou get_approval retourne REJECTED pour la même demande enregistrée, avec identités et opération corrélées et décision locale rejected non consommée
- **THEN** retry accepte cette preuve après vérification des autres préconditions, sans désarmement ni remplacement de candidate

#### Scenario: Polling intermédiaire
- **WHEN** un polling corrélé retourne PENDING avant un REJECTED corrélé
- **THEN** seul le refus terminal prouve la fin sans effet ; PENDING seul ne permet pas retry

#### Scenario: Polling divergent ou absent
- **WHEN** la réponse modifie requestId, approval_id, session_id, directory, change_id, files ou commands, précède sa demande, ou ne confirme aucun refus terminal
- **THEN** retry refuse et conserve le gel et la réservation actuelle

#### Scenario: Refus avant enregistrement
- **WHEN** une erreur native MCP -32602 prouve un rejet de paramètres avant enregistrement, sans validation locale ni effet
- **THEN** retry MAY conserver cette preuve et réserver un essai neuf

#### Scenario: Effet ou décision non prouvé
- **WHEN** la tentative est approuvée, consommée, en attente, seulement interrompue, en erreur générique ou privée de sa décision locale
- **THEN** retry refuse et le gel reste conservé

### Requirement: Frontière native vérifiée entre tentatives
retry MUST persister une empreinte du préfixe des parties tool natives et les identifiants antérieurs sans contenu de message. retry et complete MUST vérifier que ce préfixe reste identique et contrôler le nouvel essai après cette frontière. Les identifiants de requête et approbation antérieurs MUST NOT être réutilisés.

#### Scenario: Historique altéré ou tronqué
- **WHEN** une partie native antérieure est perdue, changée ou réordonnée
- **THEN** la transition refuse sans transfert ni autorisation implicite

#### Scenario: Nouveau prévol exact
- **WHEN** les preuves historiques sont intactes et le nouvel essai satisfait les contrôles stricts existants
- **THEN** complete accepte le même job et la même candidate sans compter les refus précédents comme des exécutions

### Requirement: Mode manuel et décision HTTP explicite

Le mode de décision SHALL être `manual` par défaut. Lorsque
`OC_Codex_DECISION_MODE=manual`, le contrôleur SHALL conserver la demande en attente et
SHALL attendre une décision valide envoyée sur `POST /decision/<requestId>` sans lancer
de décision automatique.

#### Scenario: Mode manuel et décision HTTP explicite
- **WHEN** une demande est notifiée en mode manuel sans décision
- **THEN** le contrôleur attend POST /decision/<requestId> sans lancer de décision automatique

### Requirement: Commandes strictes dans le contexte du job

Pour un job déclarant `strictCommands: true`, le contrôleur SHALL exiger une commande de
permission strictement identique à celle du mandat et SHALL refuser également
l'instrumentation de sortie reconnue. Cette restriction SHALL s'appliquer à la session
et au répertoire du contrat de job ; son absence SHALL préserver la corrélation
instrumentée existante.

#### Scenario: Commandes strictes dans le contexte du job
- **WHEN** un job strict demande une permission avec le suffixe de sortie reconnu
- **THEN** le contrôleur refuse la corrélation dans la session et le répertoire de ce job

### Requirement: Neutralité et réveil automatique corrélé

La demande SHALL rester indécise jusqu'à une décision HTTP explicite et corrélée de
l'orchestrateur principal. En mode automatique, le contrôleur SHALL conserver son chemin
existant de transmission structurée à la tâche orchestratrice persistante, de heartbeat
lié à cette tâche et de notification locale persistante lorsque le réveil est
indisponible. Une relance SHALL NOT créer, modifier ou consommer une décision ou une
permission.

#### Scenario: Neutralité et réveil automatique corrélé
- **WHEN** un rappel automatique ne peut être transmis à la tâche persistante ni à son heartbeat
- **THEN** le contrôleur conserve une notification locale sans créer ou consommer de décision ni de permission

### Requirement: Statut du job et option de commandes strictes

Le statut public du contrôleur SHALL résumer le job armé et son gate sans exposer le
contenu du projet ni une décision CAB. Le champ facultatif `strictCommands` SHALL être
booléen, valoir `false` par défaut et être conservé dans le contrat persistant et son
état public. Le contrôleur SHALL refuser toute autre valeur avant d'armer le job.

#### Scenario: Statut du job et option de commandes strictes
- **WHEN** un client arme un job avec strictCommands non booléen
- **THEN** le contrôleur refuse le contrat avant armement ; un contrat valide conserve son option et expose son gate sans contenu du projet

### Requirement: Contextes de contrôleur isolés par RUN
Le contrôleur MUST héberger plusieurs contextes de job isolés. Les routes /runs/<runId>/job/... et /runs/<runId>/decision/<requestId> MUST cibler un seul contexte. Une mutation sans cible ambiguë MUST être refusée. Une récupération MUST conserver le propriétaire du change et invalider les anciennes permissions.

#### Scenario: Isolation concurrente
- **WHEN** A possède une validation indécise et B termine
- **THEN** le gate de B ne dépend pas du compteur métier de A

### Requirement: Réconciliation humaine du prévol exécuté sans permission native
La phase reconcile de /job/recover MUST être explicitement demandée par l'orchestrateur avec developerAuthorization, une référence non vide à l'accord spécifique du développeur. Elle MUST conserver job, RUN, candidate, gel et critères. Elle MUST vérifier les préconditions techniques, les identités de récupération, previousPreflightRequestId et un preflightRequestId inédit. Le retry ordinaire MUST conserver ses refus existants.

#### Scenario: Prévol inoffensif exécuté sous allow
- **WHEN** l'historique natif prouve que le message utilisateur parent du prévol portait tools.bash=true, une réponse MCP APPROVED corrélée avec reviewer CGPT, exactement une commande /usr/bin/true terminée exit 0 après cette réponse, puis broker_readiness READY sans attente
- **THEN** reconcile MUST exiger la règle native finale bash ask dans la candidate, refuser toute consommation locale connue et réserver uniquement un essai neuf
- **AND** reconcile MUST conserver l'empreinte et les identifiants de l'ancien essai avec outcome EXECUTED_WITHOUT_NATIVE_ONCE, horodatage et référence d'autorisation, sans modifier la décision précédente ni prétendre que once a été consommée

#### Scenario: Historique natif utilisable après redémarrage coordonné
- **WHEN** les décisions locales ne sont plus disponibles après un redémarrage du contrôleur et l'accord humain spécifique ainsi que toutes les preuves natives du cas allow sont vérifiés
- **THEN** reconcile MAY conserver cette frontière historique sans reconstruire une décision locale, consommer une permission ou valider complete
- **AND** le nouvel essai MUST encore prouver sa propre décision locale, sa réponse MCP, une permission once consommée, exit 0 et READY avant complete

#### Scenario: Effet ou preuve non conforme
- **WHEN** l'accord manque, la candidate reste sous allow, l'historique est altéré, une permission est consommée localement, la commande diverge ou un autre outil natif est observé
- **THEN** reconcile MUST refuser la transition sans invalider l'ancien mandat ni lever le gel

### Requirement: Permission native vérifiée avant approbation exécutable
Pour un job armé, le contrôleur MUST vérifier par HTTP la session et le répertoire du mandat avant admission et avant enregistrement d'une décision approved. La dernière règle couvrant le type natif bash ou edit MUST avoir pattern `*` et action ask. Les jokers du nom de permission MUST être pris en compte. Une règle absente, malformée, plus spécifique en dernière position ou une réponse indisponible MUST refuser l'opération avec un diagnostic explicite sans décision implicite.

#### Scenario: Outil réactivé en allow
- **WHEN** une validation exécutable de job armé vise une session dont la dernière règle native est allow
- **THEN** le contrôleur refuse avant enregistrement de la validation et ne transmet aucune permission

#### Scenario: Règle modifiée avant décision
- **WHEN** la règle devient allow après admission mais avant une décision approved manuelle ou automatique
- **THEN** aucune décision approved n'est enregistrée et un refus explicite reste possible

#### Scenario: Ancien usage sans job armé
- **WHEN** une validation est utilisée sans job armé
- **THEN** sa compatibilité historique est préservée

### Requirement: Garde natif lors du prévol et de la transmission
Les contrôles de récupération MUST vérifier la règle Bash ask de la candidate avant prévol. Avant de transmettre once pour un job armé, le contrôleur MUST vérifier de nouveau les règles de la session. Après chaque contrôle asynchrone, il MUST réévaluer l'admission et l'absence de décision concurrente. Un échec MUST conserver les décisions antérieures, le gel éventuel et l'absence de consommation.

#### Scenario: Candidate permissive
- **WHEN** prepare vise une candidate sans règle Bash ask vérifiable
- **THEN** prepare est refusé sans modifier le job ni approuver le prévol

#### Scenario: Dérive avant once
- **WHEN** une règle permissive apparaît avant la transmission native
- **THEN** once n'est pas transmis et l'approbation historique reste intacte

### Requirement: Interfaces de coordination ciblées
Le contrôleur MUST exposer acquisition, consultation, annulation d'attente et libération d'accès par RUN, ainsi que publication ciblée et gel exceptionnel. Les mutations MUST contrôler propriétaire, contexte, génération, contenu et idempotence. Une mutation sans cible non ambiguë MUST être refusée.

#### Scenario: Acquisition dans un autre RUN
- **WHEN** une demande ne correspond pas au propriétaire ou au contexte ciblé
- **THEN** elle est refusée sans attribution de protection ni permission

### Requirement: Recontrôle des protections avant once
Après chaque contrôle asynchrone et avant once, le contrôleur MUST recontrôler admission, génération, révisions, identité d'opération et accès compatible. Les gardes natives ask et la consommation unique MUST être conservées. Une décision approved historique MUST rester intacte si l'opération n'est plus exécutable.

#### Scenario: Jeton devenu périmé
- **WHEN** le jeton est libéré pendant une vérification native
- **THEN** aucune permission once n'est transmise

#### Scenario: Règle native devenue allow
- **WHEN** les protections sont valides mais la règle native n'est plus ask
- **THEN** la permission reste refusée conformément aux gardes existantes

### Requirement: Fin native corrélée avant libération
Le contrôleur MUST corréler la fin native aux opérations protégées et conserver tout effet incertain. Un état idle ou une absence de permission seule MUST NOT prouver la fin des effets. La libération MUST exiger les preuves techniques et l'examen de l'orchestrateur prévus pour cette frontière.

#### Scenario: Fin SSE perdue
- **WHEN** une session devient idle sans fin d'outil corrélée exploitable
- **THEN** ses protections restent détenues jusqu'à réconciliation

### Requirement: Gate sans protection non résolue
Un gate terminal normal MUST être refusé tant que le RUN conserve un effet non résolu, un groupe actif ou une acquisition non clôturée. Une attente de ressource MUST rester non terminale. Le gate MUST conserver ses gardes antérieures sans dépendre des attentes métier indépendantes des pairs.

#### Scenario: Rapport terminé mais effet incertain
- **WHEN** le rapport existe mais une ancienne acquisition du RUN reste d'issue inconnue
- **THEN** le gate normal reste refusé et le change n'est pas livré

### Requirement: Publication sans cohorte générale
La publication ciblée MUST contrôler les seules protections, révisions et preuves nécessaires. Une activité native indépendante MUST NOT exiger ready, quiescence ou réconciliation générale. Le reçu MUST être durable et distinct du gate et d'une approbation.

#### Scenario: Pair occupé indépendant
- **WHEN** B exécute une opération indépendante pendant la publication de A
- **THEN** la seule activité de B ne refuse pas la publication de A

### Requirement: Compatibilité historique sans concurrence implicite
L'usage historique unique sans RUN MUST conserver ses décisions et once, sans coexister avec les RUN coordonnés. Son usage mutable MUST laisser une trace durable de sessions/racines. Le passage au profil Multi-RUN MUST exiger une clôture explicite sous réconciliation globale, avec quiescence native et preuves des effets ; idle seul MUST NOT effacer cette trace.

#### Scenario: Passage depuis un usage historique
- **WHEN** une permission historique a été consommée puis un RUN concurrent est demandé
- **THEN** l'admission attend une clôture réconciliée des sessions/racines historiques sans rejouer la permission

### Requirement: Limite configurable de commande unitaire

Le contrôleur MUST résoudre au démarrage `OC_Codex_MAX_COMMAND_LENGTH`, ou son alias `OC_CGPT_MAX_COMMAND_LENGTH` si le nom principal est absent. Il MUST utiliser 16 384 lorsque les deux noms sont absents. La limite MUST être commune à tous les contextes du processus.

#### Scenario: Défaut et bornes
- **WHEN** aucune variable de limite n'est fournie et une commande contient 16 383, 16 384 ou 16 385 unités UTF-16
- **THEN** les deux premières passent le contrôle de longueur et la troisième est refusée

#### Scenario: Configuration et alias
- **WHEN** le nom principal est absent et l'alias vaut 2000
- **THEN** le seuil est 2 000, avec admission à 1 999 et 2 000 et refus à 2 001

#### Scenario: Priorité explicite
- **WHEN** les deux noms sont présents
- **THEN** le nom principal prévaut, y compris lorsque sa valeur est invalide

### Requirement: Validation de la configuration de longueur

Une valeur fournie MUST contenir uniquement des chiffres ASCII et représenter un entier strictement positif et sûr JavaScript. Une valeur invalide MUST faire échouer le démarrage avant ouverture HTTP, modification du registre ou lancement de Codex, sans afficher sa valeur.

#### Scenario: Configuration invalide
- **WHEN** la valeur fournie est vide, zéro, signée, fractionnaire, espacée, exponentielle, non numérique ou supérieure au maximum entier sûr
- **THEN** le démarrage échoue avec un diagnostic nommant la variable sans exposer sa valeur

### Requirement: Refus explicite des commandes trop longues

Pour les demandes et rappels, sur les routes historiques, resource et par RUN, le contrôleur MUST comparer la longueur de commande à la limite en unités UTF-16, sans modifier son contenu. Un dépassement MUST retourner HTTP 400 JSON contenant `error=command-too-long`, un message construit depuis les longueurs, `maxLength`, `actualLength` et `unit=utf16`. Le diagnostic MUST NOT exposer le contenu de la commande. Les limites de transport MUST rester indépendantes.

#### Scenario: Dépassement sans effet
- **WHEN** une demande ou un rappel porte une commande de longueur L+1 pour une limite L
- **THEN** le contrôleur retourne le refus structuré avec les deux longueurs sans enregistrer d'opération ni de validation

#### Scenario: Unicode
- **WHEN** une commande contient des caractères BMP et hors BMP
- **THEN** leur comptage suit String.length, avec deux unités pour un caractère hors BMP

### Requirement: Refus de longueur sans autorisation implicite

Le contrôle de longueur MUST refuser avant enregistrement de l'opération, appropriation du requestId ou création de validation. Ce refus MUST NOT créer de décision, permission native ou tour Codex. Une commande longue admise MUST conserver les règles existantes de corrélation et de consommation unique.

#### Scenario: Refus avant enregistrement
- **WHEN** la commande dépasse la limite
- **THEN** aucune opération, identité de requête ou validation n'est enregistrée et aucune décision ou permission n'est créée

#### Scenario: Commande longue et permission unique
- **WHEN** une commande longue admise reçoit une décision corrélée et une permission native exacte admissible
- **THEN** le contrôleur peut transmettre une seule réponse once ; une commande divergente et une seconde permission sans nouvelle décision restent refusées selon les règles de corrélation existantes

### Requirement: Configuration publique effective
GET /status MUST exposer configuration.maxCommandLength et configuration.commandLengthUnit avec la limite résolue au démarrage et UTF-16. Les vues historiques, globales et par RUN MUST porter la même valeur sans exposer d'autres variables d'environnement.

#### Scenario: Configuration commune aux RUN
- **WHEN** le contrôleur est configuré avec une limite de 4096
- **THEN** ses statuts historiques, globaux et par RUN annoncent 4096 unités UTF-16

### Requirement: Journal public d'observation
GET /monitor/events MUST exposer un journal borné en mémoire, son identité de démarrage, son compteur et sa couverture. Les événements MUST se limiter aux types, dates, séquences, identifiants corrélés et enums fermés de décision ou d'état natif. Cette lecture MUST rester sans effet sur décisions, permissions, réservations ou relances.

#### Scenario: Demande puis décision
- **WHEN** un mandat reçoit une décision explicite
- **THEN** le journal expose les transitions corrélées sans commande, corps de message ou raison libre et sa lecture ne retransmet aucune permission

### Requirement: Déclaration structurée de l'étape
POST /job/progress et sa route par RUN MUST accepter stepId du catalogue, stepStatus et expectedStepSequence. Les états MUST être IN_PROGRESS par défaut, ALREADY_COVERED ou NOT_APPLICABLE. Une déclaration partielle, inconnue ou périmée MUST être refusée avant mutation. Les appels historiques sans ces champs MUST rester compatibles.

#### Scenario: Revue suivie d'une correction
- **WHEN** un job armé au gate OPEN déclare IMPLEMENTATION avec la séquence courante après REVIEW
- **THEN** le contrôleur persiste le nouveau passage sans fermer le gate ni modifier la phase

### Requirement: Historique d'étape durable et borné
Le contrôleur MUST persister lifecycle schéma 1, sequence et au plus cent entrées history contenant sequence, id, status et at. La dernière entrée MUST définir l'étape courante. Les dates MUST être attribuées côté contrôleur. Une répétition identique de la dernière déclaration MUST être idempotente et une déclaration concurrente périmée MUST être refusée.

#### Scenario: Réémission après réponse perdue
- **WHEN** la dernière déclaration identique est répétée avec sa séquence attendue précédente
- **THEN** le contrôleur conserve la séquence et l'historique sans second passage

### Requirement: Neutralité métier de l'étape
Une déclaration d'étape MUST NOT créer permission, décision, reprise ou validation terminale. Après validation du gate, le contrôleur MUST refuser une nouvelle déclaration. Les événements publics MUST exposer uniquement les identifiants et états fermés d'étape avec leur séquence.

#### Scenario: Clôture annoncée sans gate
- **WHEN** un job déclare CLOSURE alors que son gate est OPEN
- **THEN** il expose Clôture 11/11 mais conserve le gate OPEN

### Requirement: Admission native avant appropriation durable
Le contrôleur MUST vérifier identité, admission locale et ask avant de persister propriétaire et opération ensemble. Après tout contrôle asynchrone, il MUST recontrôler le contexte. Aucun traitement de décision MUST commencer avant succès durable. Une panne de persistance MUST fermer l'admission sans permission.

#### Scenario: Refus ask sans enregistrement partiel
- **WHEN** une notification vise une session devenue allow
- **THEN** aucun propriétaire, opération ou validation n'est créé et aucune permission n'est transmise

### Requirement: Réconciliation explicite du prévol orphelin
POST /runs/<runId>/validation/reconcile MUST exiger transactionId, developerAuthorization, jobId, recoveryId et approval exact. Seul le prévol courant gelé, armé, gate OPEN, sans décision, permission ni effet MUST être admis. Les identités, ask, propriétaire, opération PREPARED et preuves natives PENDING MUST être vérifiés sans reconstruction d'intention.

#### Scenario: Demande orpheline sans effet
- **WHEN** les preuves corrélées et l'autorisation spécifique sont vérifiées
- **THEN** le contrôleur conserve la candidate et crée uniquement une validation apte au rejet explicite, sans décision automatique

#### Scenario: Capacité effectivement chargée
- **WHEN** les statuts du contrôleur et du RUN sont consultés
- **THEN** notificationReconciliation vaut rejection-only-v1 pour identifier cette API indépendamment de la version source de base

#### Scenario: Preuve divergente ou effet incertain
- **WHEN** un champ, préfixe natif, propriétaire ou opération diverge, ou qu'un effet ou accès existe
- **THEN** la réconciliation est refusée sans modifier le job, les pairs ou une décision

### Requirement: Retry préservé après réconciliation de notification
La réconciliation MUST NOT assouplir retry ou complete. Un rejet local explicite et un résultat MCP REJECTED du même approval_id MUST précéder retry. Une perte de contexte local MUST NOT autoriser une restauration automatique depuis le seul reçu.

#### Scenario: Polling et nouvel essai
- **WHEN** le même prévol réconcilié est rejeté et son polling confirme REJECTED
- **THEN** retry existant peut réserver une nouvelle identité dans la même candidate en conservant ses autres gardes

### Requirement: Diagnostic public de métadonnées sans mutation
L'outil approval-metadata MUST projeter uniquement les métadonnées d'une approbation demandée depuis une sortie native broker_health déjà disponible dans une session technique existante. Il MUST utiliser seulement GET et MUST NOT lire le magasin privé, lancer un outil, créer une session, exposer titre/résumé/commande/fichiers/secrets ou annuler une demande. Les identités absentes MUST rester non vérifiables.

#### Scenario: Demande non attribuée
- **WHEN** le diagnostic trouve l'identifiant demandé dans le watchdog natif mais ne trouve pas son RUN
- **THEN** il restitue l'observation, sa provenance et les champs inconnus sans attribuer ou décider la demande

### Requirement: Adoption contrôlée de l'amorçage
POST /coordination/maintenance/adopt MUST lire la transaction dans un journal privé fermé, vérifier autorité, empreintes, expiration, identités des processus et preuve native fraîche. Il MUST lier le reçu à la génération DRAINING existante avant de confirmer HELD. Un reçu client seul MUST NOT suffire.

#### Scenario: Reçu divergent
- **WHEN** le journal, l'autorité, le code chargé ou la génération diverge
- **THEN** l'adoption est refusée sans modification du job, du registre ou d'une permission

### Requirement: Maintenance de récupération préparée sans effet
Seule la récupération préparée nommée et prouvée sans outil natif dans la candidate MAY être admise pour confirmation ou libération SHARED_MAINTENANCE. RUN/job/candidate/recovery, propriétaire, opération, préfixes et critères MUST rester identiques. retry, complete et ask/once MUST rester inchangés.

#### Scenario: Prévol commencé
- **WHEN** une commande, un accès, une décision approved ou une preuve incertaine existe
- **THEN** la maintenance spéciale est refusée et la récupération reste gelée

### Requirement: Magasin privé d'amorçage explicite
OC_Codex_MAINTENANCE_STATE_DIR MAY désigner un répertoire absolu privé hors workspace, sans liens. Par défaut le contrôleur MUST utiliser frozen-controller dans son magasin privé update. Le lecteur MUST vérifier propriétaire, mode et régularité et MUST NOT suivre un chemin fourni par le corps HTTP.

#### Scenario: Chemin client arbitraire
- **WHEN** un client tente de choisir un autre fichier ou un journal non privé
- **THEN** l'adoption est refusée sans lire ce chemin

### Requirement: Réconciliation de rejet du job courant suspendu
La route de réconciliation MUST accepter recoveryId=null uniquement pour le job armé courant, la session réservée exacte et le RUN sous PAUSE explicite. La preuve native MUST établir une unique soumission identique et un état PENDING corrélé ; un timeout -32001 MUST exiger un polling ultérieur du même approval_id.

#### Scenario: Écriture non exécutée refusée avant admission
- **WHEN** la soumission du job courant a expiré, un polling exact confirme PENDING, le RUN est en PAUSE et aucune permission ou effet n'existe
- **THEN** un reçu REJECTION_ONLY autorise seulement le refus corrélé, sans exécuter ni rejouer l'écriture

#### Scenario: Effet ou identité non prouvée
- **WHEN** la séquence comporte un outil métier, une autre identité, un polling différent, une permission, une décision ou une dérive du préfixe
- **THEN** la réconciliation refuse sans création partielle ni permission

### Requirement: Absence d'effet avant rejet réconcilié
La réconciliation MUST refuser tout outil d'effet, autre demande, permission native, session occupée, décision ou acquisition dans la séquence examinée. Elle MUST recontrôler le préfixe natif avant persistance.

#### Scenario: Préfixe modifié
- **WHEN** les parties natives diffèrent entre l'inspection et le dernier recontrôle
- **THEN** aucun reçu n'est créé

### Requirement: Admission atomique limitée au rejet
Le propriétaire, l'opération et le reçu MUST être persistés atomiquement lorsque l'admission initiale est absente. La validation reconstruite MUST accepter exclusivement rejected, jamais approved ou needs_clarification. Le profil de récupération historique MUST rester compatible.

#### Scenario: Refus de l'approbation
- **WHEN** une décision approved ou needs_clarification est proposée sur une demande réconciliée
- **THEN** le contrôleur refuse sans transmission native

#### Scenario: Ancien contrôleur sans propriétaire
- **WHEN** la route de décision ne peut attribuer la demande non exécutée et une décision explicite de rejet est fournie par l'orchestrateur autorisé
- **THEN** l'outil manuel reject du broker peut enregistrer uniquement ce refus ; le même approval_id MUST confirmer REJECTED avant clôture du mandat, sans faire passer une pause pour une approbation

### Requirement: Compatibilité du reçu générique
Le reçu générique MUST conserver recoveryId=null et les preuves dans le schéma 4. Un ancien lecteur incompatible MUST refuser cet état après premier usage. Un retour à cet ancien lecteur MUST exiger une réconciliation distincte et MUST NOT restaurer un registre antérieur effaçant les nouvelles décisions.

#### Scenario: Retour après premier rejet générique
- **WHEN** un ancien lecteur ne reconnaît pas recoveryId=null
- **THEN** le retour reste bloqué jusqu'à conversion autorisée, sans perte de décision

### Requirement: Réconciliation humaine d'un prévol rejeté après perte de décision locale

CAB MUST offrir reconcile-rejected distinct de retry, avec autorisation humaine, identités conservées, prochain identifiant inédit et empreinte native complète. Il MUST vérifier le rejet corrélé sans effet, recontrôler puis sceller un reçu non exécutable. Il MUST NOT reconstruire approved ou émettre once. Le retry ordinaire MUST refuser une décision locale perdue.

#### Scenario: Rejet réconcilié après redémarrage

- **GIVEN** un recovery conservé avec erreur MCP -32602 puis soumission et rejet natif corrélés, sans effet et décision locale perdue
- **WHEN** le développeur autorise reconcile-rejected avec les identités et l'empreinte exactes
- **THEN** CAB scelle le reçu sans permission, conserve l'historique et réserve un nouveau prévol qui exige ses propres décision, once, exit 0 et READY
- **AND** seule une soumission enregistrée de /usr/bin/true exact est admise ; seules les erreurs MCP -32602 antérieures sont reconnues comme refus avant enregistrement

#### Scenario: Preuve insuffisante ou effet possible

- **GIVEN** une approbation, une commande, un autre outil, une activité, une permission, une demande restante, une identité différente ou une empreinte divergente
- **WHEN** reconcile-rejected est demandé
- **THEN** CAB refuse sans modifier le recovery ni transmettre de permission

### Requirement: Levée globale explicitement liée à un rejet réconcilié

Sous gel, reconcile-rejected MAY être examiné avec infrastructure saine et transaction exacte. Confirm et release MUST exiger autorité, reçu du même RUN/job/recovery et historique inchangé. CAB MUST vérifier la cohorte sans effet ni attente et refuser toute autre récupération non réconciliée. Cette exception MUST NOT autoriser de travail métier ni modifier les gardes des autres transactions.

#### Scenario: Transaction liée et cohorte quiescente

- **GIVEN** un reçu de rejet sans effet lié à la transaction globale courante et une cohorte vérifiée quiescente
- **WHEN** l'orchestrateur confirme puis libère explicitement cette transaction avec l'autorité et la référence exactes
- **THEN** CAB conserve le recovery et ses preuves et permet seulement la poursuite normale du nouveau prévol

#### Scenario: Transaction ou cohorte divergente

- **GIVEN** une transaction différente, un reçu altéré, un effet inconnu ou une autre récupération non réconciliée
- **WHEN** une confirmation ou libération est demandée
- **THEN** CAB refuse et conserve le gel

### Requirement: Réconciliation des diagnostics Code Mode sans effet

La réconciliation explicite du rejet MAY reconnaître une découverte native strictement diagnostique, un polling corrélé interrompu et le relais natif de rejected décidé par CGPT. Elle MUST exiger le rejet terminal concordant et l'absence de toute commande ou approbation. Ces diagnostics MUST NOT autoriser une opération ni affaiblir le retry ordinaire. Le préfixe natif antérieur MUST rester vérifiable.

#### Scenario: Polling interrompu puis rejet explicite

- **WHEN** une demande est suivie d'un polling interrompu sans effet puis d'un rejet natif corrélé sous autorité humaine
- **THEN** CAB peut sceller le rejet sans reconstruire de décision exécutable et impose un nouveau prévol

#### Scenario: Commande ou approbation dans le diagnostic

- **WHEN** un outil exécutant une commande ou une approbation apparaît parmi les diagnostics
- **THEN** CAB refuse la réconciliation sans effet et conserve les protections

### Requirement: Retry d’un refus MCP V2 avant enregistrement

Une récupération MAY reprendre après refus MCP V2 avant enregistrement seulement si la preuve native structurée, son enveloppe complète, les identités exactes de l’appel, l’absence de demande enregistrée et l’absence d’effet établissent ce refus. Une chaîne d’erreur libre, un timeout ou une approbation consommée MUST NOT suffire. Le retry MUST conserver job, RUN, candidate et historique et exiger une nouvelle identité de prévol. Les permissions et effets non résolus MUST rester bloquants.

#### Scenario: Refus natif structuré sans enregistrement
- **WHEN** la preuve native corrélée établit le rejet de validation avant enregistrement et exclut tout autre effet
- **THEN** retry conserve la candidate et prépare uniquement un prévol neuf sans décision reconstruite

#### Scenario: Texte libre ou état divergent
- **WHEN** l’enveloppe, le type de refus, les identités, l’absence d’enregistrement ou la frontière native ne sont pas prouvés
- **THEN** le retry reste refusé sans émission de once ni perte des preuves

### Requirement: Changements natifs SSE V2 pris en compte

Le contrôleur MUST invalider ses observations de génération sur les événements natifs V2 de démarrage et fin d’exécution ou de changement de permission corrélés aux sessions contrôlées. Il MUST NOT interpréter un événement sans identité vérifiable comme une preuve d’inactivité ou de permission. Les états statistiques de session MUST distinguer activité, fin native et permission sans transformer un événement en décision CAB.

#### Scenario: Exécution V2 corrélée
- **WHEN** une exécution démarre ou finit sur une session contrôlée et son événement V2 porte une identité valide
- **THEN** l’observation de génération est invalidée et l’état statistique peut être actualisé sans décision implicite

#### Scenario: Session étrangère
- **WHEN** l’événement concerne une autre session ou n’établit pas son identité
- **THEN** il ne prouve ni disponibilité ni effet de la session contrôlée

### Requirement: Schéma de référence d’accès non vide

Le schéma MCP MUST refuser un access_id vide ou invalide et documenter son omission lorsqu’aucun accès existant n’est référencé. Le validateur du broker MUST continuer de refuser une valeur invalide avant toute persistance.

#### Scenario: Référence absente
- **WHEN** aucun accès existant n’est référencé
- **THEN** la clé access_id peut être omise et une chaîne vide reste refusée sans créer d’approbation

### Requirement: Retry historique du refus MCP direct sans effet

Le retry du refus access_id vide MAY accepter la provenance native directe qualifiée comme alternative à Code Mode. Il MUST conserver identités et génération exactes, commande /usr/bin/true unique, absence d’enregistrement et d’effet, refus déterministe et lookup natif inconnu corrélé. Une identité de prévol neuve MUST être exigée dans la même candidate. Texte seul, effet inconnu ou permission consommée MUST rester bloquants.

#### Scenario: Refus et lookup directs corrélés
- **WHEN** les deux parties directes sont qualifiées, corrélées et sans effet prouvé
- **THEN** le retry conserve RUN, job et candidate et prépare seulement le prévol neuf

#### Scenario: Preuve insuffisante
- **WHEN** une garde de provenance, identité, refus, lookup, quiescence ou absence d’effet manque
- **THEN** le retry reste refusé sans rejouer once ni altérer l’historique

### Requirement: Observabilité des refus de validation avant admission

Les refus HTTP de validation traités dans le contexte du job ou le contrôleur MUST alimenter le compteur de tentatives HTTP du RUN corrélé connu une seule fois par requête. Une tentative non admise MUST NOT être ajoutée aux validations indécises ni devenir une décision REJECTED. Une identité non attribuable MUST NOT inventer de propriétaire. Les corps et contenus métier MUST rester exclus de ces compteurs.

#### Scenario: Refus local et tentatives répétées
- **WHEN** une même demande reçoit plusieurs refus locaux de révision avant admission
- **THEN** chaque tentative compte une fois pour le RUN connu, sans admission, décision ou once et sans compter deux fois un même traitement

#### Scenario: Autre RUN ou admission valide
- **WHEN** le refus concerne un pair ou qu’une demande valide est admise
- **THEN** aucun refus parasite n’est attribué au RUN observé et les mécanismes d’admission existants sont conservés

### Requirement: Preuve native de restitution sans effet
POST /runs/<runId>/test-resources/release-unused MUST exiger une autorisation développeur spécifique, une attestation exhaustive et une empreinte de l’historique normalisé complet de la session exacte. Le contrôleur MUST relire l’historique, corréler les opérations terminées même déjà COMPLETED et contrôler idle, permissions, absence de mandat et de recovery.

#### Scenario: Fin de diagnostic non nulle examinée
- **WHEN** le diagnostic est terminé avec un exit non nul, sa preuve exacte est conservée et l’orchestrateur atteste son absence d’effet
- **THEN** le contrôleur peut accepter la restitution sans convertir cet exit en succès

#### Scenario: Activité concurrente ou preuve fabriquée
- **WHEN** une opération, un message ou une permission apparaît pendant la vérification ou qu’une empreinte ou identité diverge
- **THEN** la restitution est refusée et toutes les protections sont conservées

### Requirement: Refus et reçu de restitution sans effet
Un historique changé, incomplet, indisponible, un appel inconnu ou une fin divergente MUST refuser sans libération. Le reçu MUST conserver les empreintes de preuve, décision et frontière sans recopier le transcript ni les secrets. Cette route MUST NOT accorder de permission, relancer SSH ou réarmer un job.

#### Scenario: Historique inaccessible
- **WHEN** le contrôleur ne peut pas relire la preuve native complète
- **THEN** il refuse la restitution et ne lance aucun outil de réparation
