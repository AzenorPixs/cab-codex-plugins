# Changelog

Toutes les évolutions significatives de CAB seront documentées dans ce fichier.

## Unreleased

## 0.84.0 - 2026-09-21

- `/cab update` synchronise la commande de profil avec
  `AzenorPixs/cab-codex-plugins` au lieu d'une source incorrecte.
- Alignement du broker, du contrôleur et des commandes sur la version `0.84.0`.

## 0.74.0 - 2026-09-19

- `/cab update` vérifie désormais aussi la commande CAB du profil Codex face à
  `AzenorPixs/tools-codex` et la remplace atomiquement si GitHub est plus récent.
- Alignement du broker, du contrôleur et du plugin sur la version `0.74.0`.

## 0.73.0 - 2026-09-19

- Ajout de `/cab update`, qui compare la version du plugin CAB et celle de sa
  marketplace avant de déléguer une mise à niveau nécessaire à Codex.
- Alignement du broker, du contrôleur et du plugin sur la version `0.73.0`.

## 0.72.1 - 2026-09-14

- Le contrôleur corrèle désormais une commande Bash lorsque OpenCode ajoute
  uniquement son instrumentation de sortie déterministe reconnue.
- Toute autre transformation de commande reste non corrélée et ne reçoit pas
  de permission native.
- Alignement du broker, du contrôleur et du plugin sur la version `0.72.1`.

## 0.72.0 - 2026-09-14

- Le contrôleur démarre désormais en mode de décision `manual` par défaut afin
  que l'orchestrateur conserve la décision corrélée de chaque mandat.
- Alignement du broker, du contrôleur et du plugin sur la version `0.72.0`.

## 0.71.0 - 2026-09-14

- Documentation du contrôleur CAB supervisé par le service utilisateur
  `cgpt-approval-bridge-controller.service`, avec redémarrage automatique et
  sans processus éphémère pendant un RUN.
- Alignement de la commande `/cab` sur ce même service pour `start` et `stop`.
- Alignement du broker, du contrôleur et du plugin sur la version `0.71.0`.

## 0.69.1 - 2026-09-14

- Le contrôleur accepte désormais toute racine de projet absolue fournie au
  démarrage, sans liste codée en dur de projets pilotés.
- Conservation des protections existantes : exécution hors sandbox déclarée et
  interface HTTP limitée au loopback.
- Alignement du broker, du contrôleur et du plugin sur la version `0.69.1`.

## 0.69.0 - 2026-09-14

- Le mode de décision manuelle du contrôleur devient le comportement par défaut,
  pour conserver les mandats PENDING jusqu'à une décision HTTP corrélée de
  l'orchestrateur.
- Conservation du mode de décision automatique existant, de la corrélation
  `requestId` / `approval_id` / `change_id` et de la consommation unique des
  permissions OpenCode.
- Alignement des versions du broker, du contrôleur et du plugin sur `0.69.0`.

- Correction de la validation des mandats unitaires : une commande unique peut
  désormais être validée avec une liste `files` vide.
- Passage à des mandats unitaires : Codex pilote et valide chaque opération
  OpenCode, y compris l’archivage OpenSpec ; CAB ne transmet qu’une décision
  corrélée à une permission native unique.
- Alignement du plugin, de la commande `/cab` et des cadrages sur la session
  OpenCode persistante et l'état MCP natif `/mcp`.
- Correction de la documentation des variables du broker vers les noms
  effectivement implémentés `CGPT_*`.
- Uniformisation de la terminologie utilisateur sur Codex, tout en conservant
  les identifiants techniques historiques `cgpt-validation` et `CGPT_*`.
- Établissement du socle OpenSpec des capacités CAB.
- Normalisation de l'arborescence du plugin Codex.
- Déplacement de la marketplace Codex et du plugin à la racine du dépôt pour la distribution GitHub privée.
- Réparation du contrat HTTP du contrôleur local.
