## ADDED Requirements

### Requirement: Mandat autonome explicite
CAB MUST lier un mandat initial au projet, change, RUN, SID et génération.
Le développeur et l’orchestrateur MUST résoudre les choix et décisions nécessaires
au change avant le démarrage du codage ; le mandat MUST conserver leurs décisions.
Un mandat avec décisions non résolues MUST NOT activer la réalisation autonome.
Dans son périmètre, le codeur MUST pouvoir réaliser, corriger et tester sans
validation intermédiaire de l’orchestrateur. Les contrôles mécaniques MUST rester actifs.

#### Scenario: Mission préparée
- **WHEN** un mandat valide couvre les chemins réservés et toutes les décisions sont résolues
- **THEN** plusieurs écritures et cycles de tests sont possibles sans décision intermédiaire

#### Scenario: Décision préalable absente
- **WHEN** un choix nécessaire reste indécis
- **THEN** le démarrage autonome est refusé avant toute écriture métier

### Requirement: Exceptions limitées et poursuite indépendante
Le codeur MUST solliciter l’orchestrateur seulement pour hors change, hors cadrage,
outil de développement nécessaire absent ou consultation de ressources web.
L’accord MUST être borné au besoin cohérent ; les travaux indépendants MUST continuer.
Une panne irrécupérable MUST être rapportée avec ses preuves sans inventer une autorisation.

#### Scenario: Échec de test ordinaire
- **WHEN** un essai échoue dans le périmètre
- **THEN** le codeur diagnostique et corrige sans demande d’approbation

### Requirement: Revue finale liée à la révision
Le codeur MUST soumettre résultat, critères, tests, preuves et limites en un dossier final.
L’orchestrateur MUST accepter ou demander des corrections regroupées. CAB MUST
lier l’acceptation à une empreinte des sources et preuves, puis la revérifier avant publication.
La télémétrie MUST distinguer opérations techniques et sollicitations décisionnelles.

#### Scenario: Correction après revue
- **WHEN** l’orchestrateur refuse le dossier final avec des corrections
- **THEN** la réalisation reprend sous le même mandat et une nouvelle soumission est requise

#### Scenario: Modification après acceptation
- **WHEN** une source couverte change après la revue
- **THEN** la publication est refusée jusqu’à une nouvelle revue de la révision réelle

### Requirement: Isolation et compatibilité de la délégation
CAB MUST protéger secrets, pairs, réservations et effets incertains. Une délégation
MUST NOT autoriser un shell hôte libre ou un accès web implicite. Les sessions historiques
MUST rester lisibles sans recevoir une délégation implicite. La reprise MUST conserver
identités, mandat et reçus sans rejouer une commande connue.

#### Scenario: Reprise après réponse perdue
- **WHEN** un reçu d’exécution existe
- **THEN** la même identité consulte son résultat sans relancer l’effet

## MODIFIED Requirements

### Requirement: Autonomie dans le mandat et atelier isolé
CAB SHALL permettre lectures et essais autonomes, avec atelier propre RW. Sous
mandat autonome, les chemins réservés SHALL être RW sans validation intermédiaire ;
code et tests SHALL être revus ensemble à la fin. Sans ce mandat, les écritures
hors atelier SHALL conserver leur validation préalable. Les accès web SHALL être
autorisés explicitement, les pairs protégés et toute extension arbitrée dans
l’autorité de l’orchestrateur ou du développeur.

#### Scenario: Livraison depuis l’atelier
- **WHEN** un RUN historique prépare un diff dans son atelier sans mandat autonome
- **THEN** le pilote valide le lot exact avant application au projet

#### Scenario: Mission autonome
- **WHEN** un mandat autonome couvre les chemins du change
- **THEN** les écritures ne demandent pas de validation intermédiaire et le code et les tests sont revus ensemble à la fin

### Requirement: Exécution autonome isolée de l’atelier
Le broker SHALL exposer atelier_execute et atelier_status pour un RUN armé.
Le contrôleur SHALL qualifier SID/RUN/génération/change et l’appel natif avant
lancement. Les essais SHALL être autonomes, avec projet/runtimes RO, atelier propre RW,
pairs masqués et réseau isolé. Dans un mandat autonomous-change-v1, les chemins
projet explicitement réservés et vérifiés SHALL aussi être RW.

#### Scenario: Essai sous le compte OpenCode
- **WHEN** le codeur lance un essai corrélé sans mandat autonome
- **THEN** seul son atelier permet les écritures et le projet reste RO

#### Scenario: Réponse d’essai perdue
- **WHEN** l’appel a déjà un reçu INTENT, RUNNING ou terminal
- **THEN** la même identité ne relance pas la commande et atelier_status consulte le reçu

### Requirement: Atelier prioritaire pour les tests
Les bancs et leurs capacités autorisées SHALL être définis dans le cadrage initial.
Dans un mandat autonome, le codeur SHALL choisir ses tests et les bancs couverts
sans validation intermédiaire. Les voies techniques des bancs externes et les
réservations SHALL rester vérifiées ; l’absence d’un adaptateur nécessaire SHALL
être traitée comme outil absent, sans repli hôte libre. Sans mandat autonome,
le protocole historique de justification LXC/Docker SHALL rester applicable.

#### Scenario: Recette exigeant un privilège absent de l’atelier
- **WHEN** le cadrage autonome couvre une ressource de test disponible et sa voie technique est qualifiée
- **THEN** le codeur peut l’utiliser sans arbitrage supplémentaire sur le choix du banc

### Requirement: Ressources externes et protections conservées
Le catalogue SHALL identifier les voies techniques et réservations des ressources
externes. Une déclaration SHALL NOT allouer une ressource, exposer un secret ou
monter un socket de contrôle. Les accès web SHALL rester explicitement autorisés.
Les effets sous mandat autonome SHALL suivre ses contrôles mécaniques ; les autres
SHALL conserver leurs validations. Le lanceur SHALL protéger secrets et pairs,
avec seuls atelier et chemins du mandat RW.

#### Scenario: Docker et LXC déclarés
- **WHEN** un projet déclare un socket Docker et un conteneur LXC de test
- **THEN** le catalogue indique leur voie d’accès, sans monter le socket ni allouer une ressource

#### Scenario: Outils système avec identité et navigateurs locaux
- **WHEN** un exécutable requiert une identité Unix ou une configuration navigateur
- **THEN** le lanceur fournit une identité synthétique et les ressources RO nécessaires sans exposer les comptes privés
