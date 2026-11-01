# Tâches

- [x] 1. Spécifier la relecture native conditionnelle après un événement SSE
      terminal sans preuve d’outil corrélée.
- [x] 2. Réconcilier le transcript par le validateur natif existant et préserver
      la distinction entre fin d’opération et succès.
- [x] 3. Couvrir en banc natif OpenCode 2.2.5 une commande exit 1, sa preuve,
      l’état COMPLETED et l’absence de succès métier inféré.
- [x] 4. Incrémenter la version commune, vérifier les distributions et archiver
      les preuves SCM.

## Sous-lots normalisés

Repères provisoires — code non attribué ; attribution ACL ultérieure.

| Repère provisoire | Tâches | Périmètre | Dépendance | Critère | État |
|---|---|---|---|---|---|
| reconcile-native-completion-after-terminal-sse — contrôleur | 1, 2 | Réconciliation transcript native après SSE terminal | Aucune | Seule une preuve native corrélée clôture l’opération | VALIDÉ |
| reconcile-native-completion-after-terminal-sse — qualification | 3, 4 | Banc isolé OpenCode et version commune | Contrôleur | Exit 1 corrélé, sans succès métier ni rejeu | VALIDÉ |
