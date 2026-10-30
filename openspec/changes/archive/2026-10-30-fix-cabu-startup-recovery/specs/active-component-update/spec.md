## ADDED Requirements

### Requirement: Attente bornée du contrôleur effectivement démarré
L’updater MUST attendre la version réelle du contrôleur dans le budget waitMs existant, au démarrage cible comme au rollback. Un démarrage non confirmé MUST rester distinct d’un échec de rechargement du broker. Le dépassement MUST refuser le succès, sans changer les exigences de versions, identités et readiness.

#### Scenario: Contrôleur prêt après dix secondes
- **WHEN** le contrôleur devient prêt après dix secondes mais avant expiration du budget configuré
- **THEN** l’updater poursuit seulement après observation de la version attendue

#### Scenario: Contrôleur indisponible jusqu’au terme
- **WHEN** la version attendue n’est pas observée dans le budget
- **THEN** l’activation échoue avec un diagnostic de démarrage et aucune réussite n’est déduite du seul état systemd

### Requirement: Échec de rollback durablement non terminal
Un échec après coupure ou durant la récupération MUST conserver le journal et ses sauvegardes dans une phase non terminale. ROLLBACK_FAILED MUST NOT devenir PREPARATION_FAILED. La reprise MUST traiter ce journal avant toute nouvelle transaction ; seul un rollback vérifié MAY devenir ROLLED_BACK.

#### Scenario: Reprise du rollback encore en échec
- **WHEN** une reprise d’un journal ROLLBACK_FAILED ne peut pas confirmer les services restaurés
- **THEN** le même journal reste ROLLBACK_FAILED et aucune nouvelle transaction ni donnée métier restaurée n’est créée

#### Scenario: Réparation et reprise ultérieure
- **WHEN** les conditions techniques permettent enfin de vérifier les versions et le broker restaurés
- **THEN** le rollback du même journal peut être confirmé sans modifier les RUN ni rejouer once
