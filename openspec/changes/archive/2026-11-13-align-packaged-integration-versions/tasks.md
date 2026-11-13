# Tâches — correctif de packaging

Extension demandée : MCP et exécution système autonome, sans liste de comptes.

## Sous-lots normalisés
Code non attribué. Repères provisoires, sans SL définitif :
- Contrôle et alignement : tâches1.1–1.2, sans dépendance extérieure.
- Qualification et préparation de livraison : tâches2.1–2.2, dépend du contrôle.
État VALIDÉ pour les sources, 2026-11-13 ; preuves et limites dans review.md.

- [x] 1.1 Aligner les versions3.2.1 et conserver les gardes de finalisation.
- [x] 1.2 Ajouter et tester le précontrôle avant toute mutation de payload.
- [x] 1.3 Ajouter job durable, admission authentifiée idempotente et sérialisation globale.
- [x] 1.4 Ajouter worker indépendant, unité système et contrôles de réussite réelle.
- [x] 1.5 Distribuer les outils MCP et CABU sans sudo, avec attente mécanique du reçu.
- [x] 1.6 Ajouter cache GitHub asynchrone, échéance aléatoire dans24h et étiquette Web utilisant le même job.
- [x] 1.7 Ajouter administration/update avec versions, contrôle systématique asynchrone et bouton permanent.
- [x] 2.1 Réussir la validation globale Python/TypeScript/OpenSpec et la revue documentaire.
- [x] 2.2 Préparer l'archivage, les statistiques CAB et l'inventaire complet DIU3.2.1.

Après ces validations, archiver, vérifier les rapports CAB, livrer par DIU,
activer par CABU et vérifier paquet configuré, reçu terminal et accueil réel.
