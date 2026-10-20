## ADDED Requirements

### Requirement: Catalogue stable des étapes du RUN
Le cycle MUST définir onze noms et identifiants uniques avec une position stable. Le catalogue MUST être partagé entre contrôleur et moniteur. Une étape courante MUST NOT signifier que toutes les précédentes sont validées ni estimer le temps restant.

#### Scenario: Catalogue du cycle complet
- **WHEN** le cycle est consulté
- **THEN** il présente exactement le catalogue suivant

| Position | Identifiant | Nom |
| --- | --- | --- |
| 1/11 | INITIALIZATION | Initialisation |
| 2/11 | PREFLIGHT | Prévol |
| 3/11 | ANALYSIS | Analyse |
| 4/11 | SCOPING | Cadrage |
| 5/11 | SPECIFICATION | Spécification |
| 6/11 | IMPLEMENTATION | Implémentation |
| 7/11 | VERIFICATION | Vérifications |
| 8/11 | REVIEW | Revue |
| 9/11 | ARCHIVING | Archivage |
| 10/11 | STATISTICS | Statistiques |
| 11/11 | CLOSURE | Clôture |

### Requirement: Étape distincte de la phase et des tâches
La page MUST présenter ETAT et ÉTAPE avec nom, position et total onze. Elle MUST conserver la phase technique dans le détail du RUN et le compteur de tâches indépendant. Elle MUST montrer le cycle et les passages en détail. Une étape absente MUST rester non renseignée sans déduction depuis phase, mandat ou texte libre.

#### Scenario: Rapport en cours
- **WHEN** un RUN déclare STATISTICS et possède la phase REPORT
- **THEN** la page montre ÉTAPE Statistiques 10/11 et conserve la phase REPORT dans le détail du RUN

### Requirement: Cycle avec retours explicites
Le RUN MUST accepter les retours explicites vers une étape antérieure pendant un job non terminal et conserver leur historique. Attentes, pauses et blocages MUST rester distincts. Les étapes déjà couvertes ou non applicables MUST être signalées sans changer leur position.

#### Scenario: Correction après revue
- **WHEN** Revue 8/11 détecte une correction et le RUN déclare IMPLEMENTATION
- **THEN** la page affiche Implémentation 6/11 et conserve le passage par Revue dans l'historique

### Requirement: Versions réellement observées
La page MUST afficher les versions observées du contrôleur, superviseur, broker et OpenCode, ainsi que celle du moniteur. Chaque version MUST provenir de sa propre source. Une source inconnue MUST NOT être remplacée par la version du moniteur. Les dernières versions connues MUST conserver leur fraîcheur explicite.

#### Scenario: Composants de versions différentes
- **WHEN** contrôleur et broker annoncent 1.5.0 et le superviseur 1.4.0
- **THEN** les cartes présentent ces valeurs distinctes sans les uniformiser

#### Scenario: Version native absente
- **WHEN** la santé HTTP OpenCode ne contient pas de version
- **THEN** sa carte indique une version indisponible sans utiliser la version d'une autre brique

### Requirement: Etat opérationnel distinct du cycle
La colonne ETAT MUST regrouper l'ancien état observé et remplacer PHASE dans le tableau. Elle MUST présenter RUNNING, WAITING, PAUSED, STOPPED, BLOCKED, DEGRADED, DONE, RELEASED, IDLE ou UNKNOWN selon les observations. Une source périmée MUST donner UNKNOWN ; une attente sans blocage supérieur MUST donner WAITING sans modifier l'étape.

#### Scenario: Attente pendant implémentation
- **WHEN** un RUN déclare IMPLEMENTATION et attend une décision corrélée
- **THEN** le tableau affiche ETAT WAITING et ÉTAPE Implémentation 6/11, avec phase technique conservée dans son détail

### Requirement: Surbrillance du job selon son état
La ligne du job dans Espace de travail MUST présenter un fond jaune pour WAITING et rouge pour BLOCKED. Le texte ETAT MUST rester lisible et la sélection distincte. La couleur MUST NOT modifier l'étape ou remplacer le code d'état. Une source périmée donnant UNKNOWN MUST retirer cette surbrillance courante.

#### Scenario: Attente devenue blocage
- **WHEN** l'état actuel d'un job passe de WAITING à BLOCKED
- **THEN** sa ligne passe du jaune au rouge par mise à jour SSE, sans modifier son étape

#### Scenario: Blocage prioritaire sur une attente
- **WHEN** un job possède une demande en attente et une cause actuelle d'effets inconnus ou HUMAN_REQUIRED
- **THEN** ETAT est BLOCKED et sa ligne rouge, sans masquer le blocage sous WAITING
