## ADDED Requirements

### Requirement: Autorité Git de l’administrateur Web
Une réservation de session de codage MUST NOT bloquer l’indexation des fichiers suivis ou la création d’un commit demandée par un administrateur Web authentifié. CAB MUST conserver les réservations des agents et sérialiser les opérations Git.

#### Scenario: Fichier suivi réservé
- **WHEN** l’administrateur confirme l’indexation des fichiers suivis modifiés et qu’une session en réserve un
- **THEN** CAB indexe le périmètre confirmé et conserve la réservation

#### Scenario: Commit Web avec réservations
- **WHEN** l’administrateur demande un commit manuel alors que des réservations actives existent
- **THEN** CAB exécute le commit Web selon ses autres contrôles Git habituels
