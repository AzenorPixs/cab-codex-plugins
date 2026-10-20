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
- **WHEN** le corps contient un message arbitraire, des longueurs invalides, un autre code, une autre unité, un contenu excessif ou une erreur de lecture
- **THEN** le broker conserve le diagnostic HTTP générique sans journaliser ce contenu
