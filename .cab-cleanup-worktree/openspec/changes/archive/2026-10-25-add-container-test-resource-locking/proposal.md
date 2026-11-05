# CO05 — CAB 1.10.0 — ressources de test et rafraîchissement du moniteur

## Why
Les accès temporaires coordonnent les commandes mais ne prouvent pas la restitution d'un environnement Docker/LXC entre deux commandes. Le moniteur impose une vue continue et sa carte Web dépend immédiatement du transport SSE.

## What Changes
- Réservation durable atomique des environnements Docker/LXC et navigateurs externes par RUN/change, indépendante des accès temporaires de fichiers.
- Conservation jusqu'à fin native de toutes les opérations, nettoyage et vérification de restitution corrélés ; reprise sans expiration automatique.
- Sélecteur Manuel, 1s, 3s, 7s, 30s, 1m, 5m, 10m, 30m et bouton Actualiser ; conservation locale du choix.
- Carte Web Disponible pendant les 30 minutes suivant le dernier rafraîchissement réussi, puis Non observé.
- Alignement source et distribution sur 1.10.0, sans installation ni mutation du runtime actif.

## Capabilities
### New Capabilities
- coding-model-policy : choix du prompt ou PLLM automatique, high/xhigh/repli, prévol exact et reprise du choix validé.

### Modified Capabilities
- concurrent-run-coordination : cycle durable des environnements de test.
- local-web-monitor : cadence de la vue et disponibilité Web.
- codex-integration-distribution : distribution cohérente 1.10.0.

## Impact
Registre, contrôleur, tests de coordination/HTTP/navigateurs, ressources Web, versions et documentation distribuée. Aucun nouveau paquet tiers. Le registre 4 reste lisible sans réservations de test lorsque ses identités sont canoniques et compatibles ; les anciennes clés Docker/LXC/navigateur non canoniques exigent une réconciliation avant activation ; le nouveau champ optionnel est refusé par les anciens lecteurs stricts après premier usage. Repli source avant usage ; après usage, réconciliation et lecteur compatible requis. Le contrôle ne couvre que les ressources déclarées dans un même registre CAB ; les commandes shell et les environnements ne sont jamais déduits de secrets.

## Autorisation
Périmètre élargi validé explicitement par le développeur le 25 octobre 2026, comprenant spécification, réalisation, tests, synchronisation, archivage et rapport. La préparation conserve les infrastructures, services et RUN réels.

Extension explicitement demandée en cours de session : navigateurs externes de DEVOPS.md, actuellement Chromium et Firefox, avec les mêmes garanties de réservation, nettoyage et restitution. Le change ciblé et la version 1.10.0 restent conservés.

Extension explicitement demandée : sélection de l'agent de codage OpenCode par PLLM automatique si le prompt ne fixe aucun modèle ; raisonnement high par défaut, puis xhigh si indisponible, puis politique de priorité inférieure si les deux sont indisponibles. Une valeur explicite du prompt conserve sa priorité. Les validations Codex et le broker neutre ne sont pas remplacés par un fournisseur de codage. Les anciens contrats sans négociation restent lisibles ; le protocole 1.10.0 exige la négociation et la sélection pour les nouveaux jobs pilotés.
