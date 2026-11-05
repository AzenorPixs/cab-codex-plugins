## Purpose

Préserver les échanges, décisions et observations CAB pendant une interruption de transport ou une bascule compatible, tout en conservant les identités, acquittements et protections des effets métier.

## ADDED Requirements

### Requirement: État de communication durable et corrélé

CAB MUST conserver durablement les validations admises, décisions enregistrées,
acquittements et identités d’opération nécessaires à une reprise. La lecture
MUST vérifier schéma, propriétaire, chemin, RUN, contexte et concordance avec
le registre métier avant tout usage exécutable. Une décision absente ou une
réponse native incertaine MUST NOT devenir une approbation ou une permission.

#### Scenario: Reprise d’une validation admise
- **WHEN** le contrôleur redémarre après l’admission durable d’une demande
- **THEN** la même identité et sa décision durable sont retrouvées sans nouvelle demande ni effet dupliqué

#### Scenario: Permission en issue inconnue
- **WHEN** la transmission native a pu réussir sans acquittement durable
- **THEN** la reprise conserve les protections et exige une preuve native avant toute continuation

### Requirement: Observation durable avec curseur

Les observations publiques MUST rester filtrées, bornées et non autorisantes.
Leur identité et séquence MUST survivre à un redémarrage. Une reprise par
curseur MUST distinguer rattrapage complet, doublon et lacune ; une observation
MUST NOT prouver à elle seule la décision ou la fin d’un effet.

#### Scenario: Reconnexion après bascule
- **WHEN** un client reprend depuis son dernier curseur conservé
- **THEN** les nouvelles observations sont restituées dans l’ordre et une fenêtre dépassée est signalée explicitement

### Requirement: Transfert contrôlé distinct du crash

Un transfert compatible MAY conserver la validité des baux et accès sains
uniquement après un reçu durable concordant, une frontière sans transmission
native critique en cours et la reprise de l’autorité unique. Les ressources
déjà incertaines MUST rester protégées. Le transfert MUST NOT attendre la fin
des commandes natives longues. Un crash ou reçu absent, consommé, périmé ou
divergent MUST conserver les protections de restauration historiques.

#### Scenario: Commande longue pendant maintenance compatible
- **WHEN** une commande déjà autorisée s’exécute pendant une bascule certifiée
- **THEN** son identité et ses ressources sont conservées sans nouveau once et les accès sains ne demandent pas une réconciliation générale

#### Scenario: Ancien lecteur sans contrat de transfert
- **WHEN** la source active est 2.1.81 et ne produit pas ce reçu
- **THEN** la transition ne revendique pas une continuité certifiée et conserve les voies de récupération historiques

### Requirement: Interruption de transport distincte de l’issue métier

Une déconnexion SSE ou HTTP MUST être observable sans transformer à elle seule
toutes les opérations en effets inconnus. Les effets et ressources MUST rester
protégés jusqu’à leur résultat corrélé. Les échanges techniques réessayés MUST
être dédupliqués par identité ; une permission once MUST NOT être réémise sur
la seule base d’une coupure ou d’un délai.

#### Scenario: SSE interrompu pendant une exécution
- **WHEN** le SSE disparaît alors qu’une opération native est en cours
- **THEN** CAB conserve son état durable, annonce le transport interrompu et réconcilie le résultat corrélé après reconnexion

### Requirement: Retrouver un reçu après perte de réponse MCP

Le broker MUST permettre de retrouver une demande existante par les identités
exactes requestId, RUN, session, opération et empreinte. Cette consultation
MUST NOT créer une demande, notifier le contrôleur ou autoriser un effet.
Une absence ou portée divergente MUST retourner une absence sans révéler la
demande étrangère. Le reçu retrouvé MUST conserver son approval_id d’origine.

#### Scenario: Réponse initiale perdue pendant CABU
- **WHEN** la demande est persistée mais son approval_id n’a pas atteint le codeur
- **THEN** la consultation corrélée retrouve ce même reçu et permet son polling sans nouvelle demande ni once

### Requirement: Interruption technique distincte d’un refus avant admission

Un HTTP 503 transport-update-in-progress MUST garder une demande PENDING.
Un délai de retry filtré et borné MAY accélérer la notification de la même
demande, sous sa lease exacte et avec un budget de reprises rapides. Les
autres erreurs MUST garder leur backoff existant. Ce retry MUST NOT créer
une décision, permission ou nouvelle demande.

#### Scenario: Bascule courte et même notification
- **WHEN** le contrôleur signale une interruption de transport reconnue
- **THEN** le broker reprogramme la même notification sous un délai borné sans la classer NOT_ADMITTED

### Requirement: Readiness reprise d'un broker réellement préservé

Une bascule certifiée MAY conserver une readiness READY récente si le PID,
le démarrage système et la connexion MCP du même broker sont vérifiés.
L'instance, version et date d'observation MUST rester inchangées ; ce reçu
MUST NOT inventer une publication fraîche. Une identité absente, divergente,
un âge supérieur à trente-cinq secondes ou un défaut MCP MUST imposer une
nouvelle publication native, sans annuler un transfert métier valide.

#### Scenario: Contrôleur remplacé et broker inchangé
- **WHEN** le broker d'avant bascule est encore le même processus connecté et sa readiness reste dans la fenêtre de fraîcheur
- **THEN** les échanges reprennent sans attendre le prochain heartbeat et sans rajeunir cette mesure

### Requirement: Consultation native pendant un prévol

Un lookup_validation natif qualifié MAY être classé comme observation sans
effet dans un prévol. Son enveloppe et sa corrélation MUST être vérifiées.
Son résultat, notamment found=false, MUST NOT remplacer la preuve exigée
d'un refus, de NO_EFFECT ou de l'absence d'une permission consommée.

#### Scenario: Reçu consulté après réponse perdue
- **WHEN** un wrapper natif non exécuté et corrélé retourne le snapshot du reçu
- **THEN** cette lecture ne constitue pas un effet environnemental et conserve toutes les preuves métier du prévol
