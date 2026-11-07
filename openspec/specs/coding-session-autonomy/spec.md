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
