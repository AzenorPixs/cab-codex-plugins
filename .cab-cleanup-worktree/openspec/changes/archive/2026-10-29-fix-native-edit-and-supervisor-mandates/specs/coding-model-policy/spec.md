## MODIFIED Requirements

### Requirement: Raisonnement medium par défaut et niveau explicite prioritaire

Le raisonnement explicite du prompt MUST prévaloir. Sinon CAB MUST choisir medium, puis high si medium est indisponible ou rejeté par preuve native, puis la candidate PLLM suivante si les deux sont indisponibles. CAB MUST vérifier les variantes réellement publiées. Authentification, quota et réseau MUST NOT prouver une incompatibilité de raisonnement.

#### Scenario: Défaut medium
- **WHEN** une candidate automatique expose medium et aucun niveau n'est fixé par le prompt
- **THEN** CAB choisit medium, même lorsque d'autres variantes sont exposées

#### Scenario: Niveau explicite conservé
- **WHEN** le prompt fixe explicitement un niveau pris en charge
- **THEN** CAB prévole exactement ce niveau sans le remplacer par medium

#### Scenario: Medium indisponible
- **WHEN** une candidate automatique ne prend pas en charge medium
- **THEN** CAB choisit high si disponible sur cette candidate, sinon examine la candidate suivante selon la priorité PLLM

#### Scenario: Modèle imposé incompatible
- **WHEN** un modèle explicite ne prend pas en charge le niveau de raisonnement requis
- **THEN** CAB refuse la sélection sans remplacer silencieusement le modèle


### Requirement: Repli après incompatibilité native prouvée
CAB MAY écarter une variante exposée mais rejetée uniquement après preuve native corrélée d'une erreur de paramètre de raisonnement reconnu. La preuve MUST correspondre au modèle, à la variante et à l'évaluation courante. Les erreurs 401, 403, 429, réseau ou paramètres étrangers MUST NOT autoriser ce repli. CAB MUST conserver seulement les références filtrées, sans corps d'erreur brut.

#### Scenario: medium refusé par le fournisseur
- **WHEN** un prévol natif prouve le rejet de medium pour la candidate automatique
- **THEN** CAB examine high sur le même modèle si aucun niveau explicite contraire n’est imposé, puis la politique inférieure seulement si medium et high sont indisponibles ; chaque nouveau choix exige son prévol réussi

#### Scenario: Quota épuisé pendant un prévol
- **WHEN** le fournisseur renvoie 429 plutôt qu'une incompatibilité de raisonnement
- **THEN** CAB ne déclare pas cette variante indisponible et bloque sans repli fondé sur cette erreur


### Requirement: Variante native ou historique corrélée
Le prévol MUST corréler session, utilisateur, réponse, modèle, variante et dates. Les variantes parent présentes MUST être cohérentes avec l’assistant. CAB MAY admettre un parent V2 sans modèle ni variante uniquement par une preuve native d’échange unique complet. Une déclaration partielle ou contradictoire MUST être refusée. Les gardes de fournisseur, modèle, date, fin stop et absence d’outil MUST être conservées.

#### Scenario: Prévol natif imbriqué et preuve historique
- **WHEN** la variante parent imbriquée ou historique correspond au choix et aux champs assistant disponibles
- **THEN** CAB peut qualifier la preuve sans modifier les variantes demandées ou les contrats historiques

#### Scenario: Contradiction ou prévol incomplet
- **WHEN** les variantes divergent, manquent ou la réponse est tronquée, en erreur ou contient un outil
- **THEN** CAB refuse la preuve sans permission implicite ni repli spéculatif

#### Scenario: Rejet natif de medium
- **WHEN** une erreur de paramètre reconnue et corrélée prouve l'indisponibilité de medium pour la candidate automatique
- **THEN** CAB examine high sur le même modèle avant la politique suivante et exige le prévol du nouveau choix, sans considérer auth, quota ou réseau comme preuve

#### Scenario: Utilisateur natif sans modèle dans un échange unique
- **WHEN** le transcript complet contient un utilisateur précédant un seul assistant dont le modèle et la variante exacts sont observés, sans outil et aux dates admissibles
- **THEN** CAB peut valider le prévol sans ajouter de modèle ou de variante au parent utilisateur

#### Scenario: Fausse provenance ou échange ambigu
- **WHEN** une métadonnée prétend établir la provenance, le transcript est partiel, contient plusieurs échanges ou un parent contradictoire
- **THEN** CAB refuse cette preuve et ne produit aucune autorisation

#### Scenario: Modèle ou variante de session divergent
- **WHEN** la session expose un modèle ou une variante différents du choix vérifié
- **THEN** CAB refuse le prévol malgré une réponse assistant antérieure conforme


## ADDED Requirements

### Requirement: Convergence du raisonnement aux entrées et reprises

Le protocole CAB distribué MUST viser medium en priorité pour une nouvelle session ou une reprise autorisée, puis high seulement si medium n’est pas disponible sur le modèle retenu. Il MUST vérifier les variantes réellement publiées et respecter un niveau explicitement imposé par le développeur.

#### Scenario: Reprise historique en high et medium disponible
- **WHEN** une reprise autorisée réexamine un ancien choix high et que medium est disponible sans niveau contraire imposé
- **THEN** l’orchestrateur prépare la convergence vers medium avec prévol et réconciliation, sans changement aveugle ni rejeu de permission

#### Scenario: Repli high
- **WHEN** medium est indisponible et high est publié sur le modèle retenu
- **THEN** high est choisi puis prévolé sans sélectionner un autre modèle pour cette seule raison

### Requirement: Transition de raisonnement conservant les preuves

Une transition de raisonnement en reprise MUST préserver RUN, job, preuves et mandats et exiger un prévol natif du nouveau choix ainsi qu’une réconciliation du contrat conservé. Elle MUST NOT modifier une session active sans frontière autorisée ni déclencher un benchmark du seul fait d’une reprise. Une transition non représentable ou non prouvée MUST être signalée sans faux succès.

#### Scenario: Transition non prouvée
- **WHEN** le prévol ou la réconciliation du contrat conservé ne permet pas une transition sûre
- **THEN** l’orchestrateur signale la limite et conserve le contexte sans prétendre medium appliqué
