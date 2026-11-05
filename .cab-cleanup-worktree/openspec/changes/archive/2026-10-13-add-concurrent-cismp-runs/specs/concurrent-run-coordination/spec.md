## Purpose

Coordonner plusieurs RUN pilotés dans un contexte OpenCode commun : attribuer exclusivement les changes, contrôler les ressources et dépendances, isoler permissions et reprises, puis sérialiser une publication réconciliée sans décision implicite.

## ADDED Requirements

### Requirement: Réservation atomique exclusive
CAB MUST attribuer un change et sa clé de sélection à un seul RUN avant
préparation ou implémentation. L'attribution MUST être durable avant réponse
et corrélée au projet, à l'orchestrateur et à la session native. Deux
sélections simultanées MUST produire au plus une réservation admise.

#### Scenario: Sélection concurrente
- **WHEN** deux RUN demandent le même change ou la même clé de sélection
- **THEN** une demande est admise et l'autre reçoit un conflit sans effet

### Requirement: Ressources et dépendances compatibles
CAB MUST refuser les réservations dont une écriture recouvre une ressource
déjà réservée. Deux lectures MAY coexister. Les dépendances actives ou
inconnues MUST différer l'admission. Codex MUST examiner les dépendances
sémantiques ; CAB MUST NOT déduire l'indépendance des seuls chemins.

#### Scenario: Contrat partagé
- **WHEN** A réserve un contrat en écriture et B demande ce contrat en lecture
- **THEN** B reçoit un conflit et peut sélectionner un autre candidat compatible

### Requirement: Propriétaire durable et génération
CAB MUST conserver la réservation après interruption et récupération du RUN.
Chaque extension MUST contrôler la version attendue et les conflits. Une
ancienne génération MUST NOT autoriser une permission. Un délai seul MUST
NOT libérer ni transférer la réservation.

#### Scenario: Reprise après crash
- **WHEN** le contrôleur redémarre avec une réservation persistée
- **THEN** il la conserve et refuse toute reprise avec une ancienne génération

### Requirement: Couverture des mandats
Chaque mandat MUST être inclus dans les ressources réservées. Une commande
MUST déclarer ses ressources et CAB MUST NOT deviner ses effets shell.
Avant once, CAB MUST vérifier session native, racine, RUN, change et
génération. Une réservation MUST NOT constituer une approbation.

#### Scenario: Extension non admise
- **WHEN** un mandat vise un fichier hors réservation ou une génération ancienne
- **THEN** CAB refuse sa transmission sans produire de permission native

### Requirement: Clôture et exclusion d'intégration
La publication dans la référence commune MUST être sérialisée et précédée
des validations applicables sur la base actuelle. La réservation MUST être
conservée jusqu'à livraison et rapport vérifiés ou abandon réconcilié. Une
absence de candidat disponible MUST NOT prouver la fin globale du projet.

#### Scenario: Autres RUN actifs
- **WHEN** tous les candidats restants dépendent d'un autre RUN actif
- **THEN** CISMP attend sans déclarer le projet terminé

### Requirement: Infrastructure partagée protégée
Le profil concurrent MUST utiliser un seul broker MCP stdio dans un contexte
OpenCode commun. Créer ou arrêter un RUN MUST NOT purger ni interrompre les
autres RUN. Une opération globale MUST exiger leur inactivité et la
réconciliation de toutes les permissions et effets.

#### Scenario: Deuxième RUN
- **WHEN** un second RUN rejoint l'infrastructure déjà saine
- **THEN** il obtient son contexte sans purge ni reconnexion du broker commun

### Requirement: Barrière stable du répertoire partagé
Avant intégration, les RUN réservés MUST déclarer un jalon stable avec preuves
locales, sans mandat ni effet en attente. Le propriétaire de l'intégration
MUST suspendre les nouvelles opérations des autres RUN et vérifier leur
quiescence native. Après libération, les autres RUN MUST réconcilier la
nouvelle version de référence avant tout mandat ; les validations affectées
MUST être réexaminées sans rejouer les effets déjà prouvés.

#### Scenario: Validation globale et publication
- **WHEN** A intègre pendant que B possède une réservation indépendante
- **THEN** B attend à un jalon stable puis réconcilie la référence publiée avant reprise

### Requirement: Prompts pilotés cohérents
Tous les prompts pilotés des projets inventoriés MUST utiliser le même
protocole de réservation et un checkpoint par RUN. Les sous-jobs MUST
hériter du RUN parent. CISM, CAISM et les prompts directs MUST rester
inchangés et MUST NOT être exécutés en concurrence avec ces travaux.

#### Scenario: Sous-job CISMP
- **WHEN** CISMP appelle SPCMP ou ISMP avec plusieurs changes présents
- **THEN** le sous-job traite exclusivement le change réservé par son RUN
