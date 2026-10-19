# Approbations et accès — delta 1.3.0

## MODIFIED Requirements

### Requirement: Identité du RUN concurrent
En mode concurrent, chaque demande MUST inclure run_id, reservation_version, operation_id, operation_digest, expected_revisions et les ressources de l'opération. Le contrôleur MUST vérifier réservation, session, contenu et accès compatible avant once. Les interfaces historiques MAY rester disponibles seulement dans un contexte unique compatible.

#### Scenario: Isolation concurrente
- **WHEN** une demande porte une ancienne génération ou une identité d'opération divergente
- **THEN** la permission est refusée sans effet

## ADDED Requirements

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

