# Tâches — accueil projet et project.env

## Sous-lots normalisés
Code non attribué : repères provisoires par identifiant technique, sans SL définitif.

- Données et synchronisation : tâches 1.1–1.3 ; lecture littérale, stockage,
  autorisation, surveillance et Electric ; prérequis plateforme existante.
- Interface : tâches 2.1–2.2 ; dépend du contrat public précédent.
- Qualification et livraison : tâches 3.1–3.4 ; dépend des deux unités.
État : VALIDÉ, 2026-11-13. Preuves et limites dans review.md.
Les obligations d’archivage et de statistiques sont contrôlées après ces tâches.

## 1. Données et synchronisation
- [x] 1.1 Implémenter et tester la lecture littérale publique sans secrets.
- [x] 1.2 Persister dans projects par migration additive et exposer une shape autorisée à colonnes restreintes.
- [x] 1.3 Relire à la sélection et surveiller modifications, remplacements et suppressions externes.

## 2. Interface
- [x] 2.1 Ajouter accueil et maison ; déplacer Sessions à /projects/<ID>/sessions et vérifier les liens existants.
- [x] 2.2 Afficher nom, version, étiquettes et cartes conditionnelles depuis la base avec actualisation Electric.

## 3. Qualification et livraison
- [x] 3.1 Réussir les tests Python, migrations et contrôles d'isolation et de non-divulgation.
- [x] 3.2 Réussir construction/types et parcours réels Chromium et Firefox, desktop et mobile, avec modification externe.
- [x] 3.3 Réussir la validation globale, vérifier cohérence documentaire, OpenSpec et périmètre Git avant archivage.
- [x] 3.4 Préparer la livraison DIU CICD : inventaire intégral réconcilié et nouvelle version vérifiée.

La livraison et son contrôle suivent l’archivage et les rapports CAB ; leurs
reçus sont rapportés séparément et ne sont pas une condition préalable de cet archivage.
