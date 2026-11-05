## Sous-lots normalisés
Code non attribué ; repère purge-change-state-after-opencode-cleanup.
Convergence ACL ultérieure ; aucun code de lot attribué.

## 1. Cadrage et garanties
Objectif : préciser les deux branches, l’ordre OC→CAB, le zéro trace et les pairs.
Périmètre : inventaire, états/proofs, journal commun et couverture de rétention.
État VALIDÉ ; décision explicite du développeur le 5 novembre 2026.
- [x] 1.1 Recouper la demande humaine et les règles/runtime actuels en lecture seule.
- [x] 1.2 Produire l’inventaire et le draft d’automate, sans exécuter de purge.
- [x] 1.3 Valider la modification de garantie du journal commun pour l’effacement total.
  Preuve : réponse « Effacement total avec réancrage (recommandé) » ; payloads et
  identités des pairs conservés, chaînage/checkpoints communs renouvelables.

## 2. Spécifications et réalisation
Objectif : fournir une voie sûre, bornée et propriétaire. Dépend du1 validé.
État RÉALISÉ ET QUALIFIÉ ; voir QUALIFICATION.md.
- [x] 2.1 Spécifier la retraite qualifiée des rejets sans émission et la clôture sûre.
- [x] 2.2 Spécifier/implémenter inventaire, preuve OC, transaction et adapters des briques.
- [x] 2.3 Implémenter le traitement approuvé des journaux et la preuve d’absence/idempotence.
- [x] 2.4 Mettre à jour skill/plugin/commande et contrats de lifecycle.

Preuve documentaire du 5 novembre 2026 : `openspec validate
purge-change-state-after-opencode-cleanup --strict` réussi pour les deltas
`approval-persistence` et `change-state-erasure`. Cette vérification ne vaut
ni qualification fonctionnelle, ni publication, ni activation.

## 3. Qualification et livraison
Objectif : activer seulement une réalisation complète et réversible/reprenable.
État SOURCE QUALIFIÉE. Livraison suivie séparément dans DELIVERY.md.
- [x] 3.1 Couvrir matrice sûreté/permissions/pairs/crash/absence/anti-rejeu.
- [x] 3.2 Vérifier syntaxe, conformité OpenSpec et cohérence des versions/distributions.
- [x] 3.3 Préparer la version 2.2.40, les preuves SGS et le plan SCM de livraison.
- [x] 3.4 Préparer la procédure propriétaire et les limites de reprise dans le contrat distribué.

La tâche 3.3 initiale regroupait statistiques, commit, publication et CABU.
Elle est scindée pour respecter l’archivage source préalable imposé par SCM :
le rapport SGS est produit après archivage ; commit/publication/CABU et notification
réelle restent des obligations explicites suivies dans DELIVERY.md. Ces cases
qualifient les livrables source, jamais une activation ou une reprise métier.
