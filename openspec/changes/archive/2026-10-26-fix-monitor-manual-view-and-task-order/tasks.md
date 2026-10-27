## 1. Interface
- [x] 1.1 Déplacer les métadonnées sur une ligne dans l'en-tête et vérifier dans les deux navigateurs.
- [x] 1.2 Stabiliser la vue manuelle et préserver les gardes courantes ; vérifier temps, SSE, erreurs et sélection.
- [x] 1.3 Trier RUN et Changes par tâches cochées puis identités ; vérifier égalités et avancement inconnu.

## 2. Distribution
- [x] 2.1 Aligner toutes les briques, modules, plugin, commande et supports sur 1.10.4 ; vérifier syntaxe, copies et compatibilité.
- [x] 2.2 Réconcilier le protocole dans template, sa distribution CAB et les règles PLLM documentaires ; vérifier tous les contrôles documentaires bloquants.

## 3. Validation finale
- [x] 3.1 Vérifier les suites applicables, l'interface Chromium/Firefox, OpenSpec et la matrice documentaire sur l'état final.

Après validation globale réussie, archiver ce seul change, produire et vérifier
STATISTIQUES.md à six sections puis appliquer les étapes Git conditionnelles de SCM.

La reprise explicitement autorisée a résolu les cinq écarts documentaires :
383 tests Node réussis, zéro échec et 26 ignorés ; contrôle documentaire ciblé
28/28. Les preuves Python 73/73, navigateur et deux UID sont conservées après
vérification des empreintes. Archivage et STATISTIQUES.md vérifiés ; bilan de
blocage obsolète supprimé. Les constats historiques restent dans les preuves
locales de la phase initiale.
