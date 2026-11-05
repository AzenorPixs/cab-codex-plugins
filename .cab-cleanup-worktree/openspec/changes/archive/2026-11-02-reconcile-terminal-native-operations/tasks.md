# Tâches

- [x] 1. Lire le journal de session V2 en mode fini, valider les frames SSE,
  la borne, le watermark `log.synced` et les événements autorisés.
- [x] 2. Corréler une fin native durable au mandat exact ; conserver UNKNOWN
  pour absence, ambiguïté, erreur non classifiée ou preuve incomplète.
- [x] 3. Restaurer une décision approuvée terminée sans rejouer le tool, et
  persister l’accès UNKNOWN limité aux ressources du manifeste.
- [x] 4. Autoriser des ensembles complets compatibles du même RUN sans
  recouvrement, tout en gardant FIFO et conflit atomiques.
- [x] 5. Tester watermark, réussite, erreur/no-effect, événements absents,
  callID divergent, crash, UNKNOWN protégé et accès indépendant.
- [x] 6. Incrémenter et aligner les composants, plugins, commandes,
  spécifications, cadrages et documentation en 2.1.64.
- [x] 7. Exécuter les tests complets, validations strictes OpenSpec, produire
  `STATISTICS.md`, maintenir les cartes sans attribuer de code ACL.
