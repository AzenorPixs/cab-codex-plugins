# DIS09 — Aligner les identités publiques CAB sur 2.1.1

# Why
CABU est déjà nommé en majuscules ; le plugin et le skill principaux conservent les identifiants cab-approval-bridge et approval-bridge. Le patch 2.1.1 doit aligner les identifiants visibles et les sélecteurs d'installation tout en gardant les chemins et les contrats runtime.

# What Changes
- Plugin CAB, skill CAB, commande /CAB ; CABU, $CABU et /CABU conservés.
- Marketplace affichée CAB Codex Plugins ; skill auxiliaire accessible sous le namespace CAB.
- Références et gardes d'installation mises à jour ; chemins techniques et alias /cab conservés.
- Version commune 2.1.1, vérification, archivage, statistiques, clôture SCM et déploiement qualifié.

# Capabilities
## Modified Capabilities
- codex-integration-distribution
- active-component-update

# Impact
Manifestes, marketplace, skills, updater, commandes, tests de distribution et supports versionnés. Aucun changement des états des RUN, des services nommés ou du transport.
