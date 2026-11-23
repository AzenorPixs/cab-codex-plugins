## ADDED Requirements

### Requirement: Réconciliation des résultats incertains sur une forge

CAB MUST permettre à un administrateur de vérifier les références d’un envoi ou d’une synchronisation incertaine. Cette vérification MUST lire la forge sans envoyer ni rejouer l’opération. CAB MUST conserver le reçu initial et consigner la preuve de réconciliation.

#### Scenario: Références cibles confirmées

- **WHEN** l’administrateur vérifie un résultat `UNKNOWN` et que la branche distante et, pour une synchronisation, tous les tags correspondent exactement à la cible du reçu
- **THEN** CAB enregistre l’état cible observé et autorise un nouvel aperçu sur cette forge.

#### Scenario: Protection maintenue

- **WHEN** la lecture est impossible, les références divergent, l’opération est encore `RUNNING`, ou la configuration ou le reçu change
- **THEN** CAB conserve la protection de l’opération et indique la raison dans la fenêtre.

#### Scenario: Action explicite dans l’Overview

- **WHEN** un résultat incertain bloque les actions Envoyer ou Synchroniser
- **THEN** la fenêtre propose « Vérifier l’envoi précédent » et affiche le résultat sans lancer un nouvel envoi ni un nouvel aperçu.
