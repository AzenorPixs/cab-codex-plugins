## MODIFIED Requirements

### Requirement: Étapes et tâches du tableau des sessions

Le tableau MUST afficher étape et tâches réalisées. Les nouveaux RUN MUST
employer douze étapes dans cet ordre : Initialisation, Prévol, Analyse, Cadrage,
Spécification, Lecture du skill Version, Implémentation, Vérifications, Revue,
Archivage, Statistiques et Clôture. Les RUN historiques MUST conserver le sens
de leurs onze étapes. Le propriétaire MUST pouvoir reculer. Une étape absente
MUST rester non renseignée. Les compteurs MUST venir du tasks.md canonique.

#### Scenario: Position et avancement distincts
- **WHEN** la position déclarée ou les cases du tasks.md changent
- **THEN** la projection reflète ces données et elles ne valident ni l’accusé du skill ni le gate terminal.

### Requirement: Détail du RUN lié au change

Un clic sur le RUN MUST ouvrir /projects/<project_id>/runs/<run_id>. La page MUST
afficher identité, état, change, SID, étape, phase, activité observée, mandat, gate,
demandes indécises, jalon prouvé, attente, blocages et les étapes du cycle propre
au RUN. Elle MUST montrer les tâches du change et leur provenance. Une donnée
absente MUST rester Non observé ou Non renseigné.

#### Scenario: Change archivé ou indisponible
- **WHEN** la page du RUN est consultée
- **THEN** les tâches proviennent du change unique actif ou archivé ou sont signalées indisponibles sans lecture hors projet.

### Requirement: Autorité de sélection de version

Le codeur MUST choisir la composante de version correspondant à la spécification
et à la politique. En direct le codeur déclare le numéro. En piloté l’orchestrateur
MUST déclarer le numéro choisi par le codeur. CAB MUST refuser un numéro différent
du numéro déclaré en piloté. Une version imposée par le développeur MUST primer,
sous réserve de sa validité et de l’autorité de déclaration applicable.

#### Scenario: Livraison directe sans numéro fourni
- **WHEN** le codeur a accusé réception du skill et déclare une version admissible
- **THEN** CAB enregistre le numéro, le choix du codeur et l’identité du déclarant.

#### Scenario: Livraison pilotée
- **WHEN** l’orchestrateur a accusé réception du skill et déclare le numéro choisi par le codeur
- **THEN** CAB enregistre les deux identités et la livraison exige le numéro déclaré.

## ADDED Requirements

### Requirement: Index de session dans un répertoire de groupe projet

CAB MUST reconnaître le répertoire d’index partagé avec le groupe du projet
lorsque le propriétaire concorde, que le groupe correspond aussi à celui du
répertoire Git et que les autres comptes n’ont aucun droit. CAB MUST préserver
les modes existants et les vérifications de l’index, de sa référence et du reçu.

#### Scenario: Répertoire d’index partagé par le groupe déclaré
- **WHEN** un projet utilise un répertoire d’index en mode 2770 pour son groupe
- **THEN** CAB accepte le répertoire sans modifier son mode.

#### Scenario: Groupe étranger ou accès aux autres comptes
- **WHEN** le répertoire autorise les autres comptes ou donne accès à un groupe étranger
- **THEN** CAB conserve son refus.

### Requirement: Extension autorisée du cadrage direct

Le propriétaire d’un RUN direct MUST pouvoir consigner l’autorisation explicite
du développeur pour ajouter des fichiers exacts via une exception de cadrage et
le connecteur rattaché. CAB MUST journaliser la décision et préserver les contrôles
de chemin, les réservations et les effets en cours. En piloté, le codeur MUST
passer par l’orchestrateur désigné.

#### Scenario: Autorisation donnée dans une session directe en cours
- **WHEN** le propriétaire rattaché enregistre une autorisation pour des fichiers du projet sur une exception ouverte
- **THEN** CAB étend le cadrage du même RUN sans modifier les fichiers ni leur réservation.

#### Scenario: Demande d’un autre acteur ou d’un codeur piloté
- **WHEN** l’auteur de l’appel direct ne possède pas le RUN direct rattaché
- **THEN** CAB refuse l’extension.

### Requirement: Politique de version de projet

CAB MUST définir `PROJECT_VERSION_POLICY` de 1 à 7 dans `project.env`, source
de vérité, et projeter cette valeur dans PostgreSQL. Pour un champ absent,
CAB MUST déduire le nombre de composantes de la version valide ou utiliser 3
lorsqu’aucune version n’existe. Une incohérence MUST être visible. CAB MUST
calculer la candidate en ajoutant une unité à la position choisie et en
remettant à zéro sa seule voisine immédiate de droite si elle existe.

#### Scenario: Projet existant
- **WHEN** CAB observe une version 3.8.4.2 avec une politique absente
- **THEN** CAB écrit la politique 4 et la projette dans PostgreSQL.

#### Scenario: Incrément suivi d’une composante
- **WHEN** la deuxième composante de 2.9.4.7 est sélectionnée
- **THEN** CAB propose 2.10.0.7 sans mutation du projet.

#### Scenario: Choix de la composante
- **WHEN** le codeur consulte la politique avant de sélectionner une composante
- **THEN** CAB expose les composantes suivantes dans cet ordre :

| Politique | Composantes dans l’ordre |
| --- | --- |
| 1 | Version du projet, modifications comprises |
| 2 | Version du projet, modification de toute nature |
| 3 | Version du projet, ajout ou modification de fonctionnalité, correctif |
| 4 | Version du projet, ajout de fonctionnalité, modification de fonctionnalité, correctif |
| 5 | Majeure, mineure, ajout de fonctionnalité, modification de fonctionnalité, correctif |
| 6 | Majeure, mineure, ajout de fonctionnalité, modification majeure de fonctionnalité, modification mineure de fonctionnalité, correctif |
| 7 | Majeure, mineure, ajout de fonctionnalité, modification majeure de fonctionnalité, modification mineure de fonctionnalité, correctif majeur, correctif mineur |

### Requirement: Ordre des versions numériques

CAB MUST comparer d’abord le nombre de composantes des versions numériques.
À nombre égal, CAB MUST comparer leurs composantes numériquement de gauche à
droite. La conversion de format confirmée est une opération distincte de
l’admission d’une nouvelle version de livraison.

#### Scenario: Passage de trois à quatre composantes
- **WHEN** CAB compare 0.3.8.0 et 4.0.0
- **THEN** CAB classe 0.3.8.0 au-dessus de 4.0.0.

### Requirement: Changement de format dans Overview

CAB MUST prévisualiser dans Overview la conversion de la version courante et de
tous les tags locaux au format d’origine, en ajoutant les zéros ou en retirant
les composantes du côté choisi. Après confirmation, CAB MUST conserver les
objets référencés et les tags hors conversion. Une collision ou un aperçu
périmé MUST empêcher l’application. Un reçu MUST permettre la réconciliation
sans rejeu. L’opération MUST NOT publier de références distantes.

#### Scenario: Collision après réduction
- **WHEN** deux tags atteignent le même nom cible
- **THEN** CAB signale la collision sans mutation.

#### Scenario: Conversion des références locales
- **WHEN** un aperçu valide est confirmé pour un dépôt local
- **THEN** CAB convertit les références concernées dans une transaction Git en conservant leur objet exact, y compris l’objet d’un tag annoté
- **AND** CAB vérifie la concordance entre les références, le fichier et sa projection avant de conclure le reçu.

#### Scenario: Interruption après la transaction Git
- **WHEN** CAB retrouve le Git cible et le fichier initial exact sur le reçu de conversion
- **THEN** CAB peut terminer le fichier et sa projection sans réémettre la transaction Git.

### Requirement: Accusé de lecture du skill Version

CAB MUST imposer la lecture du skill Version au codeur en direct et à
l’orchestrateur en piloté après création ou rattachement de la spécification.
L’accusé MUST être authentifié, associé au RUN et identifier la spécification
et la révision du skill. CAB MUST refuser la proposition de version avant
l’accusé admissible.

#### Scenario: Spécification absente puis créée
- **WHEN** la spécification devient disponible pour le RUN
- **THEN** CAB demande l’accusé au rôle applicable avant toute proposition.

### Requirement: Itérations et durées par change

CAB MUST conserver les étapes sous le change et conserver chaque itération
lors d’une reprise. Il MUST calculer automatiquement les bornes, durées,
compteurs et cumuls à partir de ses propres observations. Une donnée non
mesurée MUST rester indisponible. Une description fournie par un agent MUST
rester distincte des mesures et preuves CAB. Overview MUST exposer les
itérations, le cumul par étape et celui du change.

#### Scenario: Change repris sur un autre RUN
- **WHEN** CAB observe un nouveau passage d’une étape déjà parcourue
- **THEN** CAB conserve le premier passage, ajoute une itération et augmente le cumul des durées mesurées.

#### Scenario: Déclaration répétée
- **WHEN** CAB reçoit deux fois la même transition
- **THEN** l’itération et la durée ne sont comptées qu’une fois.
