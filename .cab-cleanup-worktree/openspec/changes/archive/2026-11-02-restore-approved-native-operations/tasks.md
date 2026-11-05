# Tâches

- [x] 1. Persister la décision terminale et son identité d’opération avant la
  tentative native ; valider le schéma et les écritures concurrentes.
- [x] 2. Restaurer validation et décision depuis l’historique natif exact,
  puis rapprocher permissionId, callID, access et révisions sans texte libre.
- [x] 3. Implémenter la continuation gardée d’une permission encore pendante,
  l’observation de la fin native et la conservation d’`UNKNOWN` sans rejeu.
- [x] 4. Vérifier que les effets inconnus restent limités aux ressources
  recouvrantes et que les RUN indépendants peuvent progresser.
- [x] 5. Ajouter les tests de crash, réponse perdue, permission persistante,
  corrélation invalide, fin native, absence de fin et isolation.
- [x] 6. Incrémenter à 2.1.63 toutes les briques, commandes, plugins et
  documents ; produire les preuves SCM et maintenir les supports applicables.
- [x] 7. Exécuter les tests complets Node.js/Python, les contrôles de syntaxe
  et les validations OpenSpec strictes ; vérifier les versions communes et les
  comportements de reprise, refus et isolation.
