# Mise à jour contrôlée des briques CAB actives

## Why

Je souhaite que /cab update actualise réellement les quatre briques installées, y compris lorsqu'elles fonctionnent, sans perdre les RUN ou leurs preuves.

## What Changes

- Distribuer un jeu complet vérifié et les modules Python du broker avec le plugin.
- Préparer une transaction privée avec sauvegardes et journal durable, puis mettre CAB en maintenance partagée.
- Attendre une frontière sûre, arrêter les briques concernées, remplacer leurs seuls artefacts et restaurer les états actif/inactif initiaux.
- Vérifier les versions réellement chargées et les identités conservées, puis lever le gel ; revenir aux artefacts précédents en cas d'échec.
- Mettre à jour la procédure /cab update, ses tests, ses supports et les versions en 1.7.1.

## Capabilities

### New Capabilities

- `active-component-update` : déploiement transactionnel et récupération après interruption.

### Modified Capabilities

- `codex-integration-distribution` : actualisation des quatre briques et paquet broker complet.
- `concurrent-run-coordination` et `native-session-statistics` : version de distribution conservant leurs garanties.

## Impact

Nouvel outil standard Node.js, paquet broker synchronisé avec src/, commande, tests de déploiement simulé et documentation. Aucun ajout de dépendance, purge, migration de données, permission métier, changement du projet piloté, déploiement réel ou opération Git pendant cette préparation SCM. Périmètre autonome validé pour la version 1.7.1.
