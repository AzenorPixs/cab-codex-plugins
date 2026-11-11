# coding-session-autonomy Specification

## Purpose
Définir l’autonomie du codeur dans le change et son atelier isolé, les validations
de l’orchestrateur, le mode Codex direct et les frontières entre sessions.

## Requirements

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

### Requirement: Capacité locale d’isolation
Le lanceur SHALL utiliser bubblewrap disponible et qualifié. Son absence SHALL être un diagnostic de capacité, sans repli non isolé ni installation implicite. Les voies déjà autorisées SHALL rester utilisables.

#### Scenario: Isolation indisponible
- **WHEN** la capacité locale n’est pas disponible
- **THEN** aucun shell libre de remplacement n’est lancé ; le pilote peut utiliser une voie déjà autorisée ou qualifier une ressource supplémentaire

### Requirement: CAB direct explicite
Une session Codex MAY activer CAB direct explicitement. CAB SHALL collecter SGS et afficher le RUN/Stats/Archives/CCAB sans imposer OpenCode ou un orchestrateur fictif.

#### Scenario: Codex direct sans OpenCode
- **WHEN** CAB direct est demandé et OpenCode indisponible
- **THEN** le suivi direct et les fonctions statistiques autorisées restent utilisables

### Requirement: Sélection explicite du mode Web Monitor
La configuration OC_Codex_MODE SHALL accepter piloted par défaut ou direct explicitement. En mode direct le Web Monitor SHALL utiliser les sessions SGS directes sans sonder, démarrer ni attendre OpenCode. Cette configuration SHALL ne pas créer de RUN à elle seule ; la session native SHALL être enregistrée explicitement dans SGS.

#### Scenario: Moniteur direct indépendant
- **WHEN** OC_Codex_MODE vaut direct et une session CAB directe est enregistrée
- **THEN** le moniteur affiche cette session et ses statistiques sans dépendre du cycle de vie OpenCode

### Requirement: Ressources DevOps déclarées dans les ateliers
CAB SHALL exposer RO les outils/interpréteurs/bibliothèques locaux déclarés dans DEVOPS.md, leurs préfixes et liens nécessaires, sans exécuter le texte ni charger de secrets. L’inventaire SHALL être borné, consultable par atelier_status, actualisé avant tout nouvel essai et son SHA-256 conservé. Après régénération, un reçu existant SHALL être renvoyé sans relance. Les ressources indisponibles/protégées SHALL être signalées.

#### Scenario: Venv lié au Python DevOps
- **WHEN** DEVOPS.md déclare un interpréteur de venv dont le binaire cible dépend d’un préfixe externe
- **THEN** l’atelier peut exécuter cet interpréteur et charger ses bibliothèques, sans écrire dans le préfixe ni le projet

#### Scenario: Inventaire régénéré entre deux essais
- **WHEN** DEVOPS.md change avant une nouvelle identité d’essai
- **THEN** le catalogue et son empreinte sont actualisés ; une identité d’essai déjà enregistrée ne relance aucune commande

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

### Requirement: Prévol des règles MCP de session
Avant l'armement ou le transfert vers une session pilotée, CAB SHALL détecter une règle de session universelle qui soumet `cgpt-validation_broker_readiness` ou `cgpt-validation_request_validation` à ASK ou DENY. CAB SHALL exposer un diagnostic permettant à l'orchestrateur de choisir une politique compatible dans son mandat. Une politique héritée ou partielle SHALL NOT être présentée comme vérifiée sans observation native. Les protections shell, edit et web SHALL rester applicables.

#### Scenario: Règle de session masque une autorisation globale
- **WHEN** une règle de session universelle bloque une méthode MCP nécessaire
- **THEN** le prévol signale la méthode et refuse l'armement avant tout effet métier

#### Scenario: Pas de règle de session concluante
- **WHEN** aucune règle explicite universelle ne détermine l'accès à la méthode
- **THEN** CAB ne déduit pas une autorisation et le prévol natif reste requis

#### Scenario: Candidate de transfert incompatible
- **WHEN** une session candidate soumet une méthode MCP nécessaire à ASK ou DENY
- **THEN** le transfert est refusé avant toute modification du SID courant

### Requirement: Diagnostic de visibilité des méthodes d’atelier

Le protocole MUST documenter la vérification des permissions natives des méthodes `atelier_execute` et `atelier_status` lorsque l’atelier est nécessaire ou que leur discovery échoue. Dans le mandat existant, l’orchestrateur MAY corriger les seules règles du SID ciblé et MUST préserver les autres protections et vérifier la discovery avant usage.

#### Scenario: Règle universelle masque l’atelier
- **WHEN** le broker est connecté mais les deux méthodes sont masquées par deny dans la session
- **THEN** le propriétaire vérifie et corrige seulement les deux règles nécessaires, puis relit la policy et la discovery

#### Scenario: Session occupée ou frontière incertaine
- **WHEN** la session est active ou une permission est en attente
- **THEN** le protocole ne modifie pas sa politique avant réconciliation

### Requirement: Examen coordonné des bancs pertinents

Avant un blocage d’environnement, le codeur SHALL communiquer le critère empêché et les preuves disponibles. L’orchestrateur SHALL examiner les bancs pertinents autorisés, leur disponibilité observée et les restrictions applicables, motiver sa décision et poursuivre les voies utiles autorisées. Les preuves SHALL conserver leur portée et les protections CAB SHALL rester applicables.

#### Scenario: Échec local et banc LXC pertinent
- **WHEN** la session de codage ne dispose pas du service nécessaire et qu’un LXC pertinent est déclaré pour les tests
- **THEN** le pilote examine son autorisation et sa disponibilité, motive son choix et fait poursuivre la voie utile autorisée selon les protections CAB

#### Scenario: Restriction propre au Desktop
- **WHEN** une restriction sans installation ne concerne que le banc Desktop
- **THEN** le pilote ne l’étend pas au LXC sans autre source applicable et vérifie les autorisations du LXC

#### Scenario: Preuve limitée à son banc
- **WHEN** un test LXC réussit pour un critère d’intégration
- **THEN** sa preuve reste attachée au banc et au critère testés et ne qualifie pas automatiquement le profil Desktop

#### Scenario: Ressource non allouée ou état inconnu
- **WHEN** un banc est déclaré mais sa disponibilité ou son autorisation effective n’est pas établie
- **THEN** le pilote ne la suppose pas acquise et conserve les décisions et réservations applicables

### Requirement: Jobs d’atelier compatibles avec le groupe DevOps

Les jobs d’atelier SHALL accepter les répertoires 2770 détenus par le broker avec groupe parent qualifié et refuser les liens, propriétaires ou groupes non qualifiés et les droits accordés aux autres comptes. Les nouveaux reçus SHALL être créés en 0770. Les reçus privés historiques SHALL rester lisibles après contrôle de leur identité.

#### Scenario: Répertoire normalisé par DIU
- **WHEN** DIU applique 2770 au répertoire de jobs possédé par le broker et au groupe parent autorisé
- **THEN** l’atelier peut accéder aux jobs et les nouveaux reçus sont créés en 0770

#### Scenario: Lien ou autre compte autorisé
- **WHEN** un répertoire ou reçu est un lien, appartient à un propriétaire ou groupe non qualifié ou donne des droits aux autres comptes
- **THEN** le broker refuse avant lecture ou exécution et conserve les reçus

#### Scenario: Ancien reçu privé
- **WHEN** un reçu existant sûr est en 0600 et satisfait les contrôles d’identité
- **THEN** il reste consultable et son identité ne relance pas l’effet déjà enregistré

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

### Requirement: Accès autonomes partagés par opération
Le profil de coordination autonome MUST acquérir les chemins nécessaires ensemble
avant chaque exécution. Les opérations incompatibles MUST attendre mécaniquement ;
les opérations disjointes MUST continuer. Une fin incertaine MUST conserver ses
protections. Une révision attendue devenue périmée MUST refuser l’effet.

#### Scenario: Deux codeurs sur un document partagé
- **WHEN** deux exécutions veulent modifier le même chemin
- **THEN** une seule démarre, l’autre attend sans validation intermédiaire du pilote

### Requirement: Reçus complets et refus actionnables
Une soumission MAY référencer les essais par leur requestId ; CAB MUST résoudre
leurs empreintes complètes depuis son registre. Toute empreinte fournie MUST être
comparée strictement. Les gardes de résultat, révision, couverture et revue finale
MUST rester inchangées. Un refus MUST exposer un motif fermé et l’index du test
lorsqu’il est connu, sans contenu sensible et sans rejouer d’essai.

#### Scenario: Empreinte tronquée
- **WHEN** une soumission fournit une empreinte divergente
- **THEN** elle est refusée avec receipt-digest-mismatch et l’index concerné

#### Scenario: Empreinte non recopiée par le LLM
- **WHEN** un test terminal connu est référencé sans empreinte fournie
- **THEN** CAB joint l’empreinte complète du reçu existant avant les validations habituelles
