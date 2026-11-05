# Vérifier la couverture de policy — CAB 2.2.38

Une policy existante n’est pas nécessairement utilisable pour une opération
nouvelle. policySetupRequired=false prouve sa présence, pas son périmètre.
Dans GET /runs/<run>/recovery, examiner l’action ET le targetId exacts :
authority=orchestrator signifie que l’action et toutes ses ressources sont
couvertes ; orchestrator-policy-required signifie que cette couverture manque.
La présence d’une offre, humanDecisionRequired=false et un nativeBoundaryDigest
valide ne remplacent pas cette couverture.

Dans le change déjà autorisé, le propriétaire peut cadrer une policy neuve
par POST /runs/<run>/recovery/policy, avec policyId neuf, ownerId/version courants,
les seules actions nécessaires, ressources couvertes et justification. Pour
un retrait suivi de libération, prévoir withdraw-unissued-validation puis
release-access, sans inclure une autre ressource ou un droit plus large. La
route [de retrait](approved-attached-shell-retirement.md) et la
[policy](recovery-policy.md) définissent les schémas et gardes complets.

Relire le plan après création : policyId, authority et boundaryDigest ont pu
changer. Prélever directement son empreinte fraîche. Conserver séparément le
nativeBoundaryDigest des deux observations stables. Ne pas réutiliser une
proposition préparée sous une autre policy. Une issue d’envoi inconnue impose
la lecture du reçu exact, jamais une nouvelle action arbitraire.

Aucun accord humain supplémentaire pour cette opération bornée au change.
Si la couverture nécessaire sort du mandat ou si une décision métier n’est
pas déléguée, présenter cette seule extension au développeur. Une preuve
insuffisante reste à établir par la procédure, sans relâcher la garde serveur.

## Forme exacte d’une proposition de policy

POST /runs/<run>/recovery/policy, par le canal contrôleur déjà configuré,
Content-Type application/json et x-cab-continuity:cab-continuity-v1. Exemple
de forme seulement ; prélever les valeurs et ressources réelles du RUN :

```json
{
  "policyId": "policy-example-new",
  "ownerId": "owner-example",
  "version": 1,
  "actions": ["withdraw-unissued-validation", "release-access"],
  "resources": [
    {"key": "file:src/example.py", "mode": "read"},
    {"key": "file:out/checks/cache", "mode": "write"}
  ],
  "authorization": "Reprise technique bornée au change déjà autorisé et à ses ressources revues"
}
```

version est la réservation numérique, pas la version CAB. authorization est
la justification sous le mandat existant, jamais une extension de droits.
Les seules clés d’entrée sont celles de ce schéma ; ne pas inventer une clé
justification ou delegationJustification. Relire ensuite GET /recovery et
l’authority de la cible ; ne pas deviner un GET /recovery/policy.

Pour un reçu exact : GET /runs/<run>/recovery/receipts?actionId=<actionId>.
Un total0 ne démontre l’absence d’envoi que rapproché des traces locales ;
un résultat d’envoi inconnu conserve son identité et se diagnostique.
