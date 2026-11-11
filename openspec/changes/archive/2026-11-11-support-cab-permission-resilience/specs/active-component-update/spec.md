## MODIFIED Requirements

### Requirement: Credential contrôlé avant coupure
Avant toute coupure, l’updater MUST vérifier le credential régulier, détenu par l’utilisateur et protégé des autres comptes ; 0770 est compatible. Il MAY le créer depuis la seule affectation littérale OPENCODE_PASSWORD du project.env source ou des services, avec l’option --opencode-password-env-file. Il MUST refuser une source ambiguë et préserver un credential existant différent. Les secrets MUST NOT figurer dans les reçus, empreintes, arguments, environnement ou sorties.

#### Scenario: Credential absent sans source explicite
- **WHEN** le credential est absent et aucune source explicite n’est fournie
- **THEN** la préparation échoue avec une cause dédiée avant toute coupure

#### Scenario: Source explicite valide
- **WHEN** project.env contient une unique affectation littérale valide et le credential cible est absent ; les autres variables sont ignorées sans interprétation shell
- **THEN** seul le processus local provisionne le credential en 0770 puis poursuit sans exposer sa valeur

#### Scenario: Source ambiguë ou conflit
- **WHEN** la source contient une clé dupliquée, une valeur vide, des échappements/interpolations, un chemin non autorisé ou une valeur différente d’un credential existant
- **THEN** l’updater refuse sans remplacement du credential existant ni arrêt de service
