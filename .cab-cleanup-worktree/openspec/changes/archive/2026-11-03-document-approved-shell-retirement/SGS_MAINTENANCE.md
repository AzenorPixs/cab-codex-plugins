# Maintenance SGS du rapport global

Le rapport global est recalculé depuis les rapports STATISTICS.md archivés,
sans addition au précédent agrégat. Le helper historique de reconstruction
fournit les extracteurs ; ses contraintes de campagne91archives ne sont pas
exécutées. Les formats récents sont relus dans leurs tableaux, avec priorité
aux totaux finaux explicites ; les suites ciblées incluses dans une suite
complète ne sont pas ajoutées. Les bilans partagés explicitement exclus ne
sont pas réintégrés. Les résumés finaux de60et587tests priment sur les erreurs
intermédiaires corrigées des rapports correspondants. Les valeurs non
qualifiées restent absentes, jamais égales à zéro par supposition.

Les formats anciens jusque-là non reconnus augmentent la couverture des
mesures historiques. Le cumul ne représente pas des tests supplémentaires
exécutés pendant cette SCM. Les échecs documentés de bilans historiques
restent distincts des298succès/0échec de la présente campagne. Le volume du
code est recompté sur les sources autorisées ; une portée dont le lexer
échoue conserve N/A. Aucune archive historique n’est réécrite.

Résumé de reconstruction contrôlé :

```json
{
  "NCA": 152,
  "test_ok": "77314",
  "test_fail": "9",
  "testReportsAvailable": 142,
  "lexicalScopesUnavailable": [
    "Commun",
    "Contrôleur"
  ]
}
```

La provenance par archive et les valeurs retenues sont conservées dans la
preuve locale privée cab-2216-stats-proof.json ; les totaux du rapport sont
vérifiés contre ces enregistrements. Aucun token, reçu métier ou contenu
privé de session n’est une source des mesures.
