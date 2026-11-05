# Context
Le manifeste principal et les sélecteurs CLI utilisent cab-approval-bridge ; le frontmatter du skill principal utilise approval-bridge. /CAB est déjà canonique. CABU est déjà conforme.

# Goals / Non-Goals
Aligner les identifiants CAB et CABU en majuscules avec un patch 2.1.1. Conserver les répertoires plugins/cab-approval-bridge et skills/approval-bridge, les fichiers des services, les ports, les protocoles et l'alias /cab. Le nom du skill de statistiques reste coding-session-statistics sous le namespace du plugin CAB.

# Decisions
Mettre à jour ensemble les identités, sélecteurs et gardes de l'updater. Installer le nouveau plugin CAB par le gestionnaire Codex puis vérifier ses métadonnées avant de retirer l'ancienne installation nommée cab-approval-bridge. Sauvegarder le paquet ancien dans l'espace privé de maintenance avant le retrait géré, qui peut supprimer son cache. Conserver cette sauvegarde pour le repli par le gestionnaire Codex ; ne jamais éditer manuellement un cache. Les patchs de commande plus récents utilisent les sauvegardes et remplacements atomiques existants.

# Validation
Contrôles d'identité marketplace/manifeste/skill/commande, absence d'anciens sélecteurs actifs, cohérence des versions et copies broker ; suites Node/Python, OpenSpec strict, puis vérification des plugins et versions des quatre briques réelles. Le blocage de journal métier reste distinct et aucune purge n'est autorisée.
