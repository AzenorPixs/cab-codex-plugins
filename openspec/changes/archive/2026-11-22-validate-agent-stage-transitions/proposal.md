# Valider les étapes avec les retours de CAB

## Why

Déclarer une position ne prouve ni que l’agent a validé sa part ni que CAB a terminé les tâches de l’étape. Les deux preuves sont nécessaires pour mesurer et terminer un passage.

## What Changes

Versionner le protocole des nouveaux RUN. L’agent responsable annonce les débuts et valide les fins. CAB ouvre les passages, lance les tâches prévues et conserve leurs reçus. Un retour vers une étape ouvre une tentative et invalide les validations qui suivent.
