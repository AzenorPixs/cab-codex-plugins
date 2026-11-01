# approval-workflow Specification

## Purpose
Cette capacité définit le cycle de validation CAB entre OpenCode et CGPT, sans décision implicite ni confusion entre demandes concurrentes.

## Requirements

### Requirement: Demande corrélée et décision explicite

CAB SHALL attribuer ou accepter un `requestId` stable pour chaque demande de validation
et ne SHALL appliquer une décision que si son `requestId`, son `approval_id` et son
`change_id` correspondent à la demande en attente. Le broker SHALL rechercher la
décision contrôleur par le `requestId` métier. L'absence de décision SHALL conserver la
demande dans un état non terminal et ne SHALL jamais être interprétée comme une
approbation.

#### Scenario: Approbation corrélée
- **WHEN** une demande PENDING reçoit une décision `approved` dont les identifiants correspondent à sa demande
- **THEN** CAB la fait passer à APPROVED et restitue cette décision à OpenCode

#### Scenario: Identifiants de décision incohérents
- **WHEN** le contrôleur retourne une décision avec un `requestId`, un `approval_id` ou un `change_id` différent de la demande PENDING
- **THEN** CAB refuse la décision et conserve la demande dans un état non terminal

#### Scenario: Décision absente
- **WHEN** aucune décision contrôleur n'est disponible pour une demande PENDING
- **THEN** CAB ne modifie pas son état vers APPROVED

#### Scenario: Mode manuel sans décision
- **WHEN** le contrôleur utilise le mode manuel et aucune décision corrélée n'a été soumise
- **THEN** CAB conserve la demande PENDING sans créer de décision automatique

### Requirement: États terminaux protégés
CAB SHALL distinguer PENDING, APPROVED, REJECTED, NEEDS_CLARIFICATION, CANCELLED et EXPIRED. Une décision supplémentaire ou contradictoire pour une demande terminale SHALL être refusée.

#### Scenario: Seconde décision refusée
- **WHEN** une décision est soumise pour une demande déjà APPROVED
- **THEN** CAB conserve la première décision et refuse la seconde

### Requirement: Relance corrélée des décisions PENDING
Pour chaque validation PENDING notifiée au contrôleur et sans décision
corrélée disponible, le broker SHALL relancer le contrôleur toutes les trente
secondes. La relance SHALL contenir le même `requestId`, `approval_id` et
`change_id`, l'âge de l'attente, l'opération demandée et le dernier état
connu. Elle SHALL être journalisée, ne SHALL modifier ni l'état PENDING ni la
décision, et ne SHALL jamais transmettre une permission OpenCode.

#### Scenario: Relance sans décision
- **WHEN** une validation notifiée reste PENDING trente secondes sans décision corrélée
- **THEN** le broker envoie une relance corrélée au contrôleur et conserve la validation PENDING

#### Scenario: Décision disponible avant la relance
- **WHEN** une décision corrélée devient disponible avant l'intervalle de relance
- **THEN** le broker n'envoie pas de relance et applique seulement la décision conformément au cycle existant

### Requirement: Attente manuelle de décision corrélée

Lorsqu'un contrôleur est configuré en mode manuel, l'absence de décision automatique
SHALL conserver la demande PENDING jusqu'à la réception d'une décision corrélée.

#### Scenario: Attente manuelle de décision corrélée
- **WHEN** le contrôleur est en mode manuel et aucune décision corrélée n'est disponible
- **THEN** la demande demeure PENDING sans approbation implicite

### Requirement: Identité du RUN concurrent
En mode concurrent, chaque demande MUST inclure run_id, reservation_version, operation_id, operation_digest, expected_revisions et les ressources de l'opération. Le contrôleur MUST vérifier réservation, session, contenu et accès compatible avant once. Les interfaces historiques MAY rester disponibles seulement dans un contexte unique compatible.

#### Scenario: Isolation concurrente
- **WHEN** une demande porte une ancienne génération ou une identité d'opération divergente
- **THEN** la permission est refusée sans effet

### Requirement: Décision liée au contenu préparé
La décision MUST conserver l'identité d'opération, le manifeste, l'empreinte et les révisions de la demande. Une base devenue périmée MUST rendre cette opération inexécutable et exiger une nouvelle demande pour le contenu corrigé. La décision terminale initiale MUST rester inchangée.

#### Scenario: Modification pendant attente humaine
- **WHEN** un pair modifie une entrée après préparation et avant acquisition
- **THEN** l'ancienne approbation ne permet pas l'effet corrigé et une nouvelle décision est requise

### Requirement: Acquisition distincte de l'approbation
L'acquisition MUST rester une transition technique distincte de la décision. Une attente humaine MUST éviter de conserver inutilement des verrous d'écriture. Un verrou acquis MUST NOT approuver un mandat, couvrir un second fichier d'édition ou autoriser une seconde permission native.

#### Scenario: Ensemble multifichier
- **WHEN** A détient deux fichiers pour un groupe cohérent de deux éditions
- **THEN** chaque édition exige sa propre demande, décision et permission once

### Requirement: Éligibilité vérifiée avant permission
Avant once, CAB MUST vérifier que l'accès couvre l'opération approuvée, sa session et sa génération, et que ses révisions attendues restent valides. Une attente de verrou ou une réponse technique d'acquisition MUST NOT être interprétée comme une décision.

#### Scenario: Permission avant verrou
- **WHEN** la permission native arrive alors que l'acquisition reste en attente
- **THEN** aucune réponse once n'est transmise ni consommée

### Requirement: Diagnostic filtré de longueur refusée

Lorsqu'une notification reçoit HTTP 400 et un diagnostic `command-too-long` valide, le broker MUST conserver dans sa trace d'échec un diagnostic reconstruit uniquement à partir du code, de l'unité UTF-16 et des deux longueurs. Les longueurs MUST être des entiers positifs sûrs JavaScript et actualLength MUST dépasser maxLength. Ce traitement MUST NOT créer de décision REJECTED ou APPROVED, délivrer de permission ou modifier le cycle de notification existant.

#### Scenario: Diagnostic reconnu
- **WHEN** une notification reçoit HTTP 400 avec le code reconnu et des longueurs valides
- **THEN** la trace d'échec indique la limite et la longueur constatée sans reprendre la commande et la demande reste PENDING

### Requirement: Lecture bornée du diagnostic contrôleur

Le broker MUST borner sa lecture du corps d'erreur et MUST NOT recopier le message distant ni des champs supplémentaires. Une réponse non reconnue, excessive, malformée ou illisible MUST conserver le diagnostic HTTP générique.

#### Scenario: Diagnostic non fiable
- **WHEN** le corps contient un message arbitraire, des longueurs invalides, un code hors de la liste fermée du statut HTTP, une autre unité, un contenu excessif ou une erreur de lecture
- **THEN** le broker conserve le diagnostic HTTP générique sans journaliser ce contenu

### Requirement: Notification réconciliée limitée au rejet
Une validation créée par réconciliation de notification MUST accepter uniquement rejected explicite. approved et needs_clarification MUST être refusés. Son opération MUST rester inexécutable, sans acquisition ni once, y compris après répétition ou restauration du registre. Aucun agent automatique MUST décider cette validation.

#### Scenario: Tentative d'approbation
- **WHEN** une décision approved ou une acquisition vise l'opération réconciliée
- **THEN** elle est refusée sans modifier la décision, les accès ou les permissions

### Requirement: Diagnostic de notification structuré et filtré

Le broker MUST conserver un diagnostic optionnel du dernier échec de notification : statut HTTP et code reconnu dans une liste fermée pour ce statut, sinon code inconnu. La lecture MUST rester bornée à1024 octets et MUST NOT recopier un message distant ou des champs arbitraires. Le diagnostic command-too-long existant MUST être préservé. Un échec de notification MUST NOT créer de décision, admission ou permission.

#### Scenario: Révision attendue périmée
- **WHEN** le contrôleur retourne409 avec resource-revision-stale
- **THEN** le broker expose ce code filtré et conserve PENDING/FAILED sans décision implicite

#### Scenario: Corps non fiable
- **WHEN** le corps est inconnu, trop grand, invalide ou contient des champs arbitraires
- **THEN** aucun contenu distant arbitraire n’est exposé et le diagnostic HTTP générique reste disponible

### Requirement: Persistance du diagnostic sous lease courante

Le diagnostic MUST être enregistré seulement par la lease courante de notification. Une ancienne lease MUST NOT l’écraser. Une livraison suivante MUST actualiser son état sans faire passer l’ancien échec pour un refus courant. Les anciennes approbations sans diagnostic MUST rester compatibles ; tentatives et statut métier MUST rester distincts.

#### Scenario: Lecture après échec
- **WHEN** la notification échoue sous sa lease courante puis l’approbation est relue
- **THEN** son diagnostic filtré reste disponible avec ses tentatives sans altérer sa décision métier

#### Scenario: Lease périmée ou livraison réussie
- **WHEN** un résultat périmé arrive ou que la notification suivante réussit
- **THEN** le résultat périmé est ignoré et une livraison réussie ne conserve aucun faux refus courant

### Requirement: Attente bornée de request_validation

`request_validation` MUST utiliser un timeout fini, 120 secondes par défaut, et
refuser un timeout nul. À expiration, le broker MUST retourner le même approval
ID comme non terminal et pollable ; il MUST NOT créer une nouvelle demande,
décision ou permission. Une notification livrée MUST NOT être présentée comme
une réponse terminale.

#### Scenario: Décision absente après notification

- **WHEN** la notification est livrée mais aucune décision terminale n’arrive dans le budget
- **THEN** le broker rend `validation_timeout` avec le même approval ID et l’appel se termine

### Requirement: Clôture d’un refus déterministe avant admission
Pour une approval `PENDING`, le broker MUST produire `NOT_ADMITTED` lorsqu’une
notification au contrôleur échoue avec un diagnostic HTTP 400 ou 409 filtré,
connu et déterministe. L’état MUST rester distinct de toute décision humaine
et MUST préserver le diagnostic d’origine.

#### Scenario: Refus de révision périmée
- **WHEN** le contrôleur refuse l’admission avec `resource-revision-stale`
- **THEN** `request_validation` et le poll corrélé retournent `NOT_ADMITTED`,
  sans `decision_id`, accès, permission native ou nouvelle notification

#### Scenario: Diagnostic déterministe préexistant
- **WHEN** une approval historique reste `PENDING` avec `notification_status=FAILED`
  et un diagnostic filtré HTTP 400/409 connu
- **THEN** le prochain poll ou la réconciliation broker la clôt en
  `NOT_ADMITTED` et journalise la transition sans écraser l’erreur

### Requirement: Conservation des erreurs non déterministes
Le broker MUST conserver `PENDING` lorsque la notification échoue sans
diagnostic filtré connu, après un timeout réseau, ou avec un statut HTTP hors
de la liste déterministe. Il MUST préserver les règles actuelles de retry
borné sans transformer l’échec en approbation ou rejet.

#### Scenario: Erreur réseau ou code inconnu
- **WHEN** le contrôleur est inaccessible, retourne un 5xx, ou renvoie un code
  absent de la liste autorisée
- **THEN** l’approval reste `PENDING`, son diagnostic inconnu n’est pas
  inventé et le comportement de retry existant s’applique

### Requirement: Aucun retry du même refus
Une approval `NOT_ADMITTED` MUST être terminale et non décidable. Toute nouvelle
tentative exige une nouvelle identité de requête et des révisions relues ;
elle n’est jamais créée automatiquement par le broker.

#### Scenario: Nouvelle demande après révision actualisée
- **WHEN** l’orchestrateur relit les révisions et prépare une nouvelle demande
  exacte après `NOT_ADMITTED`
- **THEN** seul le nouveau `requestId` peut être soumis à une décision CAB
  indépendante ; l’ancienne approval ne reçoit ni décision ni permission
