## MODIFIED Requirements

### Requirement: Preuve d'exécution native V2

Toute preuve d'effet MUST corréler une permission native once, session, appel, cible, horodatages et état final. Pour les outils natifs OpenCode 2.2 reconnus, executed est informatif et MUST NOT remplacer ces contrôles ; metadata.status et metadata.exit MUST établir la fin de shell. Un état final ou le drapeau executed seul MUST NOT prouver l'effet.

#### Scenario: Outil terminé et exécuté

- **WHEN** le transcript V2 identifie l'appel, sa cible, son état final et son résultat, corrélés à une permission once propre
- **THEN** CAB peut utiliser la preuve native, y compris pour shell terminé avec executed faux

#### Scenario: Exécution non prouvée

- **WHEN** seule une valeur executed est fournie, ou si la permission, les dates ou la corrélation native divergent
- **THEN** CAB refuse la preuve d'effet

## ADDED Requirements

### Requirement: Projection stricte des appels Code Mode natifs

CAB MUST reconnaître seulement les enveloppes execute dont le programme retourne directement un appel nommé avec données littérales concordant avec les métadonnées natives. Il MUST conserver identité et empreinte de l'enveloppe complète. Il MUST NOT évaluer le programme ni accepter une transformation de résultat, un appel caché, une liste divergente ou une sortie tronquée. Les parties directes déjà supportées MUST rester inchangées.

#### Scenario: Appel unique concordant

- **WHEN** execute retourne directement un appel MCP connu avec objet JSON littéral et métadonnées natives concordantes
- **THEN** CAB expose l'opération corrélée en conservant son origine et son empreinte, sans accorder de permission
- **AND** les clés identifiants statiques non citées sont reconnues, les valeurs restent des données JSON sans variable ni expression

#### Scenario: Enveloppe ambiguë

- **WHEN** le programme transforme la sortie, ajoute un appel, diverge des métadonnées ou présente un résultat tronqué
- **THEN** CAB conserve une preuve bloquante et refuse toute admission ou fin déduite de cette enveloppe

### Requirement: Qualification native de la permission et de la fin Code Mode

Une projection Code Mode MUST conserver les contrôles de session, cible, décision, ask, once et fin native. Une intention en cours MAY contribuer à l'admission d'une demande exacte ; elle MUST NOT prouver son exécution ou sa fin. Une qualification sur OpenCode 2.2 isolé MUST vérifier la chaîne complète avant livraison du raccord.

#### Scenario: Prévol natif complet

- **WHEN** le serveur isolé exécute le prévol sous une décision corrélée et une permission once propre
- **THEN** CAB vérifie la source native, la commande exacte, exit 0 et READY avant complete

#### Scenario: Permission ou fin non prouvée

- **WHEN** l'identité, la permission ou la fin de l'appel ne peut être corrélée
- **THEN** CAB conserve le gel et ne déduit aucun succès du texte retourné
