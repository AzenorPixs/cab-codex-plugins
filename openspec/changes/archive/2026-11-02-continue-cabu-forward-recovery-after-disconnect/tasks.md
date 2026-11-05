## Reprise

- [x] Valider le reçu enfant `ROLLBACK_FAILED` et son parent `SUPERSEDED` avec identité native identique.
- [x] Accepter `brokerState=disabled` uniquement depuis une déconnexion parent confirmée.
- [x] Conserver les empreintes broker déjà égales au paquet GitHub courant sous `cab-source`.

## Qualification

- [x] Tester les cas positifs et négatifs, sans reload global ni mutation des RUN.
- [x] Mettre à jour OpenSpec, CAB, les versions communes et les statistiques d’archive.
- [x] Exécuter Node/Python, syntaxe, compilation et validation OpenSpec stricte.
