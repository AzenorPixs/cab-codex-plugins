## ADDED Requirements

### Requirement: Versions et tags de version sans préfixe
CAB MUST produire et persister les versions du projet et de release, ainsi que les nouveaux tags de version Git et de release, sans préfixe v. Une version transmise par la session MUST déterminer le tag ; à défaut, le tag par défaut MUST être égal à la version du projet.

#### Scenario: Version transmise ou défaut
- **WHEN** une session transmet une nouvelle version ou qu'un tag de version est demandé sans version fournie
- **THEN** CAB utilise respectivement la version transmise ou PROJECT_VERSION, sans ajouter de v.
- **AND** une saisie préfixée est refusée avant mutation et les lecteurs historiques restent compatibles sans renommer les anciens tags.

### Requirement: Indexation immédiate des documents de clôture
CAB MUST indexer chaque rapport statistique après son écriture, avant libération de sa réservation. Il MUST indexer immédiatement le BLOCKERS.md attribuable au RUN après sa création ou son amendement, sans absorber une réservation étrangère.

#### Scenario: Rapports et dépendance non satisfaite
- **WHEN** CAB produit les statistiques du change puis le global, ou observe un BLOCKERS.md attribuable au RUN
- **THEN** les seuls documents concernés sont indexés et leurs empreintes sont conservées.

### Requirement: Dernier commit confirmé avant clôture
Avant de déclarer une session achevée ou bloquée, CAB MUST créer et envoyer un dernier commit limité aux rapports du change, au global et au BLOCKERS.md éventuel. Les documents et destinations MUST être liés au RUN par des reçus durables ; un effet incertain MUST rester protégé sans être rejoué.

#### Scenario: Clôture achevée
- **WHEN** les critères et la livraison applicables sont confirmés
- **THEN** CAB termine les statistiques, vérifie le dernier commit local et ses envois distants, puis seulement rend CLOSED.

#### Scenario: Clôture bloquée
- **WHEN** une session s'arrête pour une dépendance non satisfaite avec BLOCKERS.md
- **THEN** CAB publie les mêmes documents finaux et le fichier de blocage avant de rendre BLOCKED, en conservant le change ouvert et le code non livré.

#### Scenario: Échec ou réponse perdue
- **WHEN** un commit ou un envoi ne peut pas être confirmé
- **THEN** CAB expose l'étape et son reçu, ne déclare pas la clôture réussie et ne répète pas un effet confirmé ou incertain.

### Requirement: Mesures terminales non récursives
CAB MUST générer les rapports finaux à partir des snapshots de fin des périodes closes. Le commit et les envois des métadonnées MUST NOT provoquer une boucle de régénération et de commits du même bilan.

#### Scenario: Publication du bilan figé
- **WHEN** la période de codage est terminée et le bilan terminal est publié
- **THEN** les observations postérieures ne modifient pas rétroactivement cette période et une reprise conserve le même reçu.

### Requirement: Tag de version déplacé par le moteur à la clôture
CAB MUST déplacer automatiquement le tag de version sur le commit terminal, sans changer le numéro de version ni ajouter de v. Le code du moteur MUST modifier la branche et le tag atomiquement, protéger leurs valeurs attendues et vérifier les deux références sur chaque forge avant la clôture.

#### Scenario: Commit terminal et tag concordants
- **WHEN** le dernier commit des statistiques et du BLOCKERS.md éventuel est créé
- **THEN** CAB déplace le tag de la version transmise, ou de PROJECT_VERSION à défaut, vers ce commit.
- **AND** l'envoi de la branche et du tag est atomique et le reçu confirme leur commit cible identique.

#### Scenario: Référence concurrente ou résultat indécis
- **WHEN** la branche ou le tag a changé depuis l'observation ou que l'envoi n'est pas confirmé
- **THEN** CAB préserve l'incertitude et ne déclare pas de clôture réussie ni ne force un déplacement non vérifié.
