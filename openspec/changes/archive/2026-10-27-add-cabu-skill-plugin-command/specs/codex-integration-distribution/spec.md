# Spec Delta

## ADDED Requirements

### Requirement: Plugin CABU et skill d'entrée
La marketplace CAB SHALL distribuer un plugin autonome `cabu`. Celui-ci SHALL exposer un skill directement invocable qui déclenche la procédure canonique `/CAB update` sans dupliquer cette procédure.

#### Scenario: Invocation directe du skill CABU
- **WHEN** le skill `cabu` est installé et invoqué
- **THEN** il exécute `/CAB update` dans la conversation courante et restitue son rapport terminal

#### Scenario: Procédure canonique indisponible
- **WHEN** le skill `cabu` est invoqué sans commande CAB compatible disponible
- **THEN** il signale la dépendance absente et n'entame aucune opération de maintenance

### Requirement: Distribution cohérente du plugin et de la commande CABU
La commande `/CABU` SHALL rester distribuée séparément du plugin dans `.codex/commands/CABU.md`, sans argument et avec la même base de version que le plugin CABU et le plugin CAB. Elle SHALL déléguer à `/CAB update` sans dupliquer sa procédure.

#### Scenario: Plugin et commande distribués à la même version
- **WHEN** une release CAB est préparée
- **THEN** la marketplace, le manifeste du plugin CABU, le skill CABU, le plugin CAB et la commande `/CABU` annoncent la base de version commune

#### Scenario: Invocation de la commande CABU
- **WHEN** `/CABU` est invoquée sans argument
- **THEN** elle délègue à la procédure `/CAB update` et produit le même rapport terminal

#### Scenario: Arguments CABU refusés avant maintenance
- **WHEN** `/CABU` est invoquée avec un argument
- **THEN** elle affiche sa syntaxe et termine avant toute opération réseau ou de maintenance
