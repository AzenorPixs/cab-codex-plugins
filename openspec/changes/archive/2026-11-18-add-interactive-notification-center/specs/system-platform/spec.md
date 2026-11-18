## ADDED Requirements

### Requirement: Centre de notifications global persistant
CAB MUST afficher une cloche permanente près du contrôle du thème, animée tant
que des notifications non lues existent. Les notifications MUST être stockées
dans `cab_notifications` et synchronisées via Electric pour les administrateurs.
L'expéditeur MUST être le nom du projet associé, ou CAB pour un message global.

#### Scenario: Lecture et navigation
- **WHEN** le développeur ouvre la cloche et parcourt les notifications
- **THEN** l'overview présente leur expéditeur et contenu avec flèches précédente/suivante
- **AND** chaque message affiché est supprimé de la base à sa première lecture
- **AND** les messages consultés restent parcourables dans cet overview jusqu'à sa fermeture
- **AND** fermer vide cet aperçu sans supprimer les messages jamais affichés

#### Scenario: Centre vide
- **WHEN** aucune notification n'existe
- **THEN** la cloche reste visible et ouvre une fenêtre indiquant l'absence de message

### Requirement: Questions interactives durables
CAB MUST pouvoir émettre une question avec plusieurs choix. Une question non
répondue MUST rester disponible après fermeture de l'overview. La réponse MUST
être validée, enregistrée une seule fois avec un reçu corrélé puis retirer la
question du centre. Une réponse MUST NOT exécuter une commande arbitraire.

#### Scenario: Réponse après réouverture
- **WHEN** une question lue est fermée puis rouverte sans réponse
- **THEN** ses choix restent proposés
- **AND** une réponse valide crée un reçu durable et retire la question
- **AND** une tentative concurrente contradictoire est refusée

### Requirement: Livraisons dans les notifications
CAB MUST supprimer l'affichage du journal CI/CD dans le bloc Git et présenter
ses étapes publiques dans une notification attribuée au projet concerné.

#### Scenario: Résultat de livraison après lecture de son avancement
- **WHEN** une livraison évolue après lecture de sa notification d'avancement
- **THEN** son résultat terminal est publié en notification non lue distincte
- **AND** les détails de livraison ne sont plus affichés dans le bloc Git

### Requirement: Nom du change dans le commit final
Le moteur CAB MUST utiliser l'identifiant du change comme message du commit
final de clôture, à la place du libellé générique des statistiques. Il MUST
conserver les garanties de commit unique et le déplacement du tag sans v.

#### Scenario: Clôture achevée ou bloquée
- **WHEN** CAB crée le commit final des statistiques et des dépendances éventuelles
- **THEN** le message du commit est l'identifiant du change concerné
- **AND** les commits historiques déjà publiés restent inchangés

### Requirement: Autorité de sélection de version
En direct, le codeur MUST choisir une version cohérente avec le versionnement du
projet sans la redemander au développeur. En piloté, l'orchestrateur MUST choisir
et déclarer la version ; le service MUST refuser une livraison sans cette
déclaration ou avec un autre numéro. Les skills et plugins MUST porter cette
répartition. Une version imposée par le développeur MUST primer.

#### Scenario: Livraison directe sans numéro fourni
- **WHEN** le développeur demande une CI/CD sans préciser de version
- **THEN** le codeur direct consulte le versionnement du projet et choisit le numéro adapté
- **AND** CAB enregistre sa sélection à l'admission de la livraison

#### Scenario: Livraison pilotée
- **WHEN** l'orchestrateur déclare une version pour le RUN piloté
- **THEN** seul ce numéro peut être livré par le codeur
- **AND** la déclaration d'un autre numéro par le codeur est refusée avant toute opération Git
