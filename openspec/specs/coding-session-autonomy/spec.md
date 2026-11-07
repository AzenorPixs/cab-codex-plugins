# coding-session-autonomy Specification

## Purpose
Définir l’autonomie du codeur dans le change et son atelier isolé, les validations
de l’orchestrateur, le mode Codex direct et les frontières entre sessions.

## Requirements

### Requirement: Autonomie dans le mandat et atelier isolé
CAB SHALL permettre lecture/exploration/outils/essais autonomes dans le change et écritures libres dans .cab-tests/<change>/<RUN> du projet. Les écritures projet hors atelier et tout accès web SHALL recevoir validation préalable de l’orchestrateur. Tout résultat de test SHALL être soumis à validation avant acceptation comme preuve. Hors change et ressources supplémentaires SHALL relever du développeur. Les ateliers pairs SHALL rester protégés.

#### Scenario: Livraison depuis l’atelier
- **WHEN** le codeur prépare un diff dans son atelier
- **THEN** le pilote valide le lot exact avant application au projet ; toute modification additionnelle requiert sa validation

### Requirement: Exécution autonome isolée de l’atelier
Le broker SHALL exposer atelier_execute et atelier_status pour un RUN armé. Le contrôleur SHALL qualifier SID/RUN/génération/change et l’appel natif avant lancement. Les essais SHALL être autonomes, avec projet/runtimes RO, seul atelier propre RW, pairs masqués et réseau isolé.

#### Scenario: Essai sous le compte OpenCode
- **WHEN** le codeur lance un essai corrélé dans son atelier avec l’isolation disponible
- **THEN** il peut copier/créer/modifier ses essais ; une écriture projet hors atelier et un accès web ne sont pas exécutables dans ce contexte

#### Scenario: Réponse d’essai perdue
- **WHEN** l’appel a déjà un reçu INTENT, RUNNING ou terminal
- **THEN** la même identité ne relance pas la commande ; atelier_status consulte le reçu et tout résultat reste à valider par le pilote

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
Les ressources Docker/LXC, services, sockets et périphériques déclarés SHALL être identifiées dans le catalogue avec leur voie CAB existante et réservations requises. Une déclaration SHALL ne pas monter un socket de contrôle, activer le réseau, allouer une ressource supplémentaire ou fournir des secrets. Les accès web et effets hors atelier SHALL conserver leurs validations. Le lanceur SHALL maintenir projet/runtimes RO, seul atelier propre RW, pairs masqués et secrets protégés.

#### Scenario: Docker et LXC déclarés
- **WHEN** un projet déclare un socket Docker et un conteneur LXC de test
- **THEN** le catalogue indique la voie d’accès CAB ; le socket n’est pas monté et aucun effet distant n’est émis par la découverte

#### Scenario: Outils système avec identité et navigateurs locaux
- **WHEN** un exécutable a besoin de getpwuid ou des configurations de navigateur
- **THEN** l’atelier fournit une identité Unix synthétique, une configuration Chromium vide et les polices système RO ; les comptes et scripts de configuration privés hôte ne sont pas exposés
