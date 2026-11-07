# Couvrir les listes d’identifiants historiques

Code non attribué. Mandat SCM permanent pour le correctif C12/PA01,
incrément2.4.2, CI/CD, publication puis CABU.

## Why
Après APPLIED du broker, la projection contrôleur rencontre deux conteneurs
connus absents du registre de listes typées : inventory.onceAcknowledged de
migration et value.restoredAccesses d’un ancien transfert. La garde a refusé
avant toute écriture contrôleur ; les services ont été remis en ligne et les
PID doivent être recapturés dans le même reçu STOPPING.

## What Changes
Déclarer ces deux listes sans modifier les booléens onceAcknowledged, conserver
les identifiants des pairs et réancrer seulement les checksums déjà prévus.
Ajouter une récupération de préparation limitée à STOPPING avant projection,
avec signature, NativePID, clôture et liaisons vérifiées, puis recapture des
services réellement chargés. Aucun rollback de données, nouveau reçu ou rejeu.
