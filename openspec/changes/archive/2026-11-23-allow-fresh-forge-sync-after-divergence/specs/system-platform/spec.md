## MODIFIED Requirements

### Requirement: Réconciliation des résultats incertains sur une forge

CAB MUST permettre à un administrateur de vérifier les références d’un envoi ou d’une synchronisation incertaine. Cette vérification MUST lire la forge sans envoyer ni rejouer l’opération. CAB MUST conserver le reçu initial et consigner la preuve de réconciliation.

#### Scenario: Références cibles confirmées

- **WHEN** l’administrateur vérifie un résultat `UNKNOWN` et que la branche distante et, pour une synchronisation, tous les tags correspondent exactement à la cible du reçu
- **THEN** CAB enregistre l’état cible observé et autorise un nouvel aperçu sur cette forge.

#### Scenario: Protection maintenue

- **WHEN** la lecture est impossible, l’opération est encore `RUNNING`, ou la configuration ou le reçu change
- **THEN** CAB conserve la protection de l’opération et indique la raison dans la fenêtre.

#### Scenario: Action explicite dans l’Overview

- **WHEN** un résultat incertain bloque les actions Envoyer ou Synchroniser
- **THEN** la fenêtre propose « Vérifier l’envoi précédent » et affiche le résultat sans lancer un nouvel envoi ni un nouvel aperçu.

#### Scenario: Clôture explicite malgré une divergence

- **WHEN** les références distantes divergent et que l’administrateur confirme la clôture sur une observation encore valide
- **THEN** CAB relit les références et, si le reçu, la configuration et l’état distant correspondent toujours à l’observation confirmée, conserve le reçu `UNKNOWN` dans l’historique et clôt la tentative sans en confirmer le résultat ni modifier la forge.
- **AND** CAB permet de préparer un nouvel aperçu de synchronisation à partir de l’état distant courant. La confirmation de ce nouvel aperçu applique les protections de branche et de tags existantes.

## ADDED Requirements

### Requirement: Sens de synchronisation des forges

CAB MUST demander le dépôt source dans la fenêtre Synchroniser de GitLab, GitHub et Forgejo. L’aperçu MUST présenter la branche source et la branche destinataire ainsi que les tags créés, déplacés ou supprimés. L’alignement MUST exiger une confirmation sur un aperçu encore valable.

#### Scenario: Git local vers la forge

- **WHEN** l’administrateur sélectionne le dépôt local puis confirme l’aperçu
- **THEN** CAB applique la synchronisation existante de la branche distante configurée et des tags de la forge.

#### Scenario: Forge vers Git local

- **WHEN** l’administrateur sélectionne la forge et confirme un aperçu encore valide
- **THEN** CAB aligne la branche locale courante et ses tags sur la branche configurée et les tags distants. Les autres branches locales et la forge restent intactes.

#### Scenario: Protection du dépôt local

- **WHEN** le dépôt local est modifié ou une opération Git est en cours, ou lorsque le reçu, la configuration ou les références changent
- **THEN** CAB refuse la synchronisation inverse ou protège son résultat incertain si l’alignement a déjà commencé.
