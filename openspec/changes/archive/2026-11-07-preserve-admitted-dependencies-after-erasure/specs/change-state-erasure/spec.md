## ADDED Requirements

### Requirement: Référentiel OpenSpec des dépendances
CAB SHALL résoudre les dépendances depuis OpenSpec du projet, selon les cadrages applicables. Un dossier archivé unique, sans homonyme actif et dont les tâches sont complétées SHALL attester le seul achèvement de ce change. L’historique CAB SHALL NOT servir de référentiel. Une archive ambiguë, active, incomplète ou inaccessible SHALL bloquer. Une archive documentaire SHALL NOT prouver une qualification produit ou une activation physique.

#### Scenario: Prédécesseur absent du runtime mais achevé dans OpenSpec
- **WHEN** son dossier OpenSpec archivé et ses tâches sont vérifiés
- **THEN** le contrôle de dépendance du change réussit sans recréer un RUN ni inventer un état livré

#### Scenario: Historique CAB livré sans change OpenSpec achevé
- **WHEN** le référentiel ne prouve pas l’achèvement requis
- **THEN** l’admission est refusée malgré l’ancien état du runtime

### Requirement: Récupération compatible sous registre projeté authentifié
Le profil compatible contrôleur5 SHALL exiger le même reçu signé RESTARTING, son registre projeté exact et les8RUN protégés. Il SHALL corriger le seul contrôle des dépendances vers OpenSpec ; décisions, dépendances déclarées, conflits et effets SHALL rester inchangés. Ce profil SHALL être retiré avant CABU final vers le runtime corrigé.

#### Scenario: Reprise avant CABU final
- **WHEN** le registre exact et le reçu signé correspondent et les dépendances OpenSpec sont satisfaites
- **THEN** les services reprennent sans modification de l’ancienne distribution ni rejeu d’effet
