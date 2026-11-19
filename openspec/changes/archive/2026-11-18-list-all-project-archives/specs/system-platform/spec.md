## ADDED Requirements

### Requirement: Archives globales des projets
CAB MUST proposer /projects/archives dans le menu commun et reprendre le tableau
des archives avec une colonne Projets affichant l'identifiant cliquable vers son
accueil. Liens RUN et actions MUST rester rattachés au bon projet.

#### Scenario: Archives de plusieurs projets
- **WHEN** le développeur ouvre Archives dans le menu Projets
- **THEN** les archives de ses projets accessibles sont affichées
- **AND** Projets mène à l'accueil correspondant et les pages par projet restent disponibles

### Requirement: Pagination à dix lignes
Les listes Sessions et Archives, globales et par projet, MUST afficher au plus
dix lignes par page avec Premier, Précédent, Page X / Y, Suivant et Dernier.
Les archives MUST être paginées côté serveur après filtrage des autorisations.

#### Scenario: Parcours complet
- **WHEN** plus de dix éléments existent
- **THEN** les pages permettent de parcourir tous les éléments autorisés sans omission
- **AND** les commandes indisponibles sont désactivées et une page devenue inexistante est ramenée à la dernière

### Requirement: Portée des archives et actualisation
CAB MUST filtrer les archives et leur flux Electric selon les projets autorisés
de l'acteur actif. Le client MUST NOT pouvoir remplacer le filtre serveur.

#### Scenario: Consultation et changements
- **WHEN** une archive est ajoutée ou retirée dans le périmètre autorisé
- **THEN** le tableau est actualisé via Electric avec le rafraîchissement de secours existant
- **AND** les acteurs inactifs, non authentifiés ou sans projet n'obtiennent aucune archive

### Requirement: Clôture hôte validée sans livraison
Sur autorisation administrative explicite, un RUN direct de développement sans
obligation de publication ou installation MUST pouvoir être déclaré sans
livraison après libération de son index. Archive, preuves courantes et rapports
MUST rester obligatoires. Le reçu CLOSED MUST déclarer delivered=false.

#### Scenario: Travail hôte achevé
- **WHEN** l'autorité déclare ce mode sur un index libéré sans effet protégé ni livraison commencée
- **THEN** le processeur normal clôture seulement après vérification des preuves et de l'archive
- **AND** les rapports sont indexés, l'index est conservé et aucun commit, tag ou push n'est effectué

#### Scenario: Réservation pendant la préparation d'archive
- **WHEN** des fichiers restent réservés par le RUN
- **THEN** la clôture attend leur indexation puis leur libération
- **AND** une reprise explicite d'un index libéré n'est admise que si son snapshot conservé est inchangé

### Requirement: Révision des critères avant qualification
Une autorité administrative MUST pouvoir réviser les critères avant toute
opération ou preuve avec empreintes attendues et motif explicite. L'ancien
contrat MUST être conservé ; commandes, producteurs et revue MUST rester inchangés.

#### Scenario: Précision de la demande avant contrôle
- **WHEN** le développeur précise dix lignes au lieu de vingt-cinq avant toute qualification
- **THEN** CAB conserve le contrat précédent et exige une nouvelle preuve du contrat révisé
- **AND** opération, preuve, gel, import, revue ou effet protégé interdisent cette révision
- **AND** un doublon identique conserve le reçu tandis qu'un contenu contradictoire est refusé

### Requirement: Annulation prouvée d'une initialisation d'index non publiée
Un administrateur MUST pouvoir régulariser un essai d'indexation UNKNOWN limité
à la préparation si l'index est identique à sa base et aucune référence de
snapshot n'existe. Le reçu original MUST rester intact et l'index de base MUST
être conservé en sauvegarde. Ce parcours MUST NOT rejouer l'essai original.

#### Scenario: Aucun fichier n'a été indexé
- **WHEN** l'administrateur cible l'effet avec empreinte attendue et autorisation explicite
- **THEN** CAB vérifie absence de verrou, de snapshot et d'autres effets protégés
- **AND** il conserve le reçu original, annule cet essai et permet un nouvel essai distinct
- **AND** toute donnée indexée ou référence existante interdit cette annulation

## MODIFIED Requirements

### Requirement: Dernier commit confirmé avant clôture
Lorsqu'une livraison Git est requise, CAB MUST publier un dernier commit limité
aux rapports du change, au global et au BLOCKERS.md éventuel avant clôture. Les
reçus MUST lier documents et destinations au RUN et protéger les effets incertains.
Un développement explicitement autorisé en clôture hôte sans livraison MUST
conserver archive, preuves et rapports sans commit ni envoi.

#### Scenario: Clôture achevée
- **WHEN** les critères et la livraison Git applicables sont confirmés
- **THEN** CAB termine les statistiques, vérifie le dernier commit local et ses envois distants, puis seulement rend CLOSED.

#### Scenario: Clôture bloquée
- **WHEN** une session avec livraison Git s'arrête pour une dépendance non satisfaite avec BLOCKERS.md
- **THEN** CAB publie les mêmes documents finaux et le fichier de blocage avant de rendre BLOCKED, en conservant le change ouvert et le code non livré.

#### Scenario: Échec ou réponse perdue
- **WHEN** un commit ou un envoi ne peut pas être confirmé
- **THEN** CAB expose l'étape et son reçu, ne déclare pas la clôture réussie et ne répète pas un effet confirmé ou incertain.

#### Scenario: Clôture hôte sans livraison
- **WHEN** ce mode de développement direct est autorisé explicitement avec index libéré et aucune obligation de publication
- **THEN** CAB vérifie archive et preuves courantes, indexe les rapports et rend CLOSED sans commit ni envoi
- **AND** le reçu distingue l'absence de livraison d'une publication réussie

### Requirement: Tag de version déplacé par le moteur à la clôture
Lorsqu'un commit terminal est requis, CAB MUST déplacer automatiquement le tag
de version sur ce commit sans changer la version ni ajouter de v. Branche et tag
MUST être modifiés atomiquement avec valeurs attendues et vérification distante.
La clôture hôte explicitement sans livraison MUST NOT déplacer un tag.

#### Scenario: Commit terminal et tag concordants
- **WHEN** le dernier commit des statistiques et du BLOCKERS.md éventuel est créé
- **THEN** CAB déplace le tag de la version transmise, ou de PROJECT_VERSION à défaut, vers ce commit.
- **AND** l'envoi de la branche et du tag est atomique et le reçu confirme leur commit cible identique.

#### Scenario: Référence concurrente ou résultat indécis
- **WHEN** la branche ou le tag a changé depuis l'observation ou que l'envoi n'est pas confirmé
- **THEN** CAB préserve l'incertitude et ne déclare pas de clôture réussie ni ne force un déplacement non vérifié.
