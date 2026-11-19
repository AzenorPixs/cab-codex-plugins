## ADDED Requirements

### Requirement: Récupération statistique sur état initial prouvé
CAB MUST réconcilier uniquement une publication arrêtée dont l'état avant des fichiers et de l'index est vérifié sous verrous. Le propriétaire MUST être arrêté ou localement inactif avec identité exacte. CAB MUST conserver UNKNOWN et son empreinte dans un événement, classer FAILED_NO_CHANGE sans succès ni rejeu et poursuivre la finalisation normale. Toute ambiguïté MUST rester protégée.

#### Scenario: Écriture non retenue
- **WHEN** propriétaire et écrivain sont arrêtés et fichier/index correspondent à leurs états avant vérifiés sans activité concurrente
- **THEN** CAB enregistre FAILED_NO_CHANGE, conserve le constat UNKNOWN et ne rejoue aucune écriture.

#### Scenario: Propriétaire local après sortie de son exécution
- **WHEN** l'identité du processus propriétaire est celle du processus courant, le job n'est plus ACTIVE sous les verrous et tous les autres constats d'état avant sont prouvés
- **THEN** CAB peut réconcilier sans redémarrage du processus, en distinguant l'arrêt de l'exécution de celui du processus ; un job ACTIVE ou un propriétaire extérieur vivant reste refusé.

### Requirement: Paquets publics utilisables indépendamment de l’umask du service
CAB MUST borner l’umask au seul subprocess de build et conserver celle du service. Avant APT, CABU MUST refuser un paquet dont les fichiers et répertoires publics attendus ne disposent pas des droits de lecture/exécution requis. Les chemins privés MUST rester hors correction.

#### Scenario: Service sous umask restrictive
- **WHEN** le service construit un paquet sous umask077
- **THEN** les données publiques du paquet restent0644 et les répertoires0755, sans changement de l’umask du parent.

#### Scenario: Paquet privatisé
- **WHEN** un paquet présente un fichier public0600 ou un répertoire0700
- **THEN** CABU refuse avant toute invocation APT et conserve le motif vérifiable.

### Requirement: Acquittement de négociation observé par le relais
Après une réponse initialize réussie observée, CAB MUST reconnaître un premier appel du client comme acquittement suffisant pour superviser son worker possédé, même sans notification initialized. Le relais MUST conserver les identités, les résultats indécis et l’interdiction de rejeu métier.

#### Scenario: Client sans notification initialized
- **WHEN** le client négocie avec succès puis envoie tools/list sans notification initialized
- **THEN** le relais reste capable de recharger son worker arrêté à frontière sûre sans rejouer une requête métier.
