## Implémentation et qualification

- [x] Autoriser uniquement l'état d'erreur CodeMode normalisé `nativeMcpError` sur `request_validation`, sans élargir les identités ni les autres méthodes.
- [x] Conserver décision, permission/once, unicité, admission RUN et états terminaux inchangés.
- [x] Tester positivement une notification exacte et négativement un marqueur absent/fabriqué, une identité divergente et des appels supplémentaires.
- [x] Tester qu'une demande déjà `NOT_ADMITTED` reste terminale et qu'aucune permission ou once n'est créée.
- [x] Aligner version commune, commandes, plugins et documentation CAB agnostique.
- [x] Exécuter suites complètes Node/Python et OpenSpec strict ; vérifier syntaxe, copies broker et diff.

## Archivage et livraison

- [x] Archiver le change et produire un `STATISTICS.md` vérifié.
- [x] Committer et publier sous SCM avec incrément de version.
- [x] Exécuter CABU et vérifier versions/runtime.
- [x] Informer PA01 qu'une demande neuve peut être préparée après vérification de son état ; ne pas rejouer la demande terminale.
