## 1. Contrat de décision

- [x] 1.1 Propager `requestId`, `approval_id` et `change_id` dans les décisions du contrôleur et vérifier leur restitution HTTP par un test Node.
- [x] 1.2 Faire interroger au broker la décision avec `requestId` et refuser toute réponse dont les trois identifiants divergent ; vérifier par un test Python isolé.

## 2. Régression et validation

- [x] 2.1 Ajouter un scénario avec `requestId` et `approval_id` distincts qui confirme l'application d'une décision `approved`.
- [x] 2.2 Exécuter les tests Node et Python concernés, puis valider strictement l'évolution avec OpenSpec.
- [ ] 2.3 Exécuter `/cab test` contre OpenCode ouvert et vérifier l'absence de demande parasite à la fin.

La validation E2E est bloquée par une approbation créée avant le correctif,
restée pendante (`DECISION_WAIT_WITHOUT_PROGRESS`). Le broker est `BLOCKED` et
refuse donc à juste titre un nouveau test actif. Aucune nouvelle demande n’a
été créée.
