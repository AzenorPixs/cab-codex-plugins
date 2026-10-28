# Tâches

- [x] 1. Remplacer les exigences OpenSpec de maintenance ordinaire par l'arrêt
  systématique des trois unités, l'installation des quatre briques et le
  rapport broker `INDISPONIBLE` si OpenCode est absent.
- [x] 2. Modifier l'updater pour ignorer les états CAB avant arrêt, remplacer
  atomiquement les fichiers des quatre briques, redémarrer les unités et
  conserver le retour arrière.
- [x] 3. Mettre à jour CAB.md, CABU.md, le skill et la référence afin que CABU
  mène l'opération jusqu'au rapport terminal.
- [x] 4. Incrémenter à 1.10.9 les modules, broker, plugin, unités, Web,
  commandes et package Python, puis aligner les cadrages et le changelog.
- [x] 5. Couvrir arrêt/redémarrage systématiques, états RUN ignorés, broker
  installé sans OpenCode, rapport indisponible et retour arrière.
- [x] 6. Exécuter les validations ciblées et globales, les tests Python,
  Chromium/Firefox headless et OpenSpec strict.
- [x] 7. Déployer CAB 1.10.9 par le flux forcé, installer plugin et commandes
  locales, vérifier les trois services et produire le rapport complet ; broker
  runtime `INDISPONIBLE` est rapporté lorsque OpenCode est absent.
