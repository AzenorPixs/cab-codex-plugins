# Supprimer une session CAB sans preuve de clôture

## Why

Une session importée ou abandonnée peut rester bloquée dans la corbeille
lorsqu’aucune preuve de clôture ne peut être produite. Les itérations de cycle
et leurs passages peuvent aussi empêcher l’effacement du RUN ou laisser des
données de suivi rattachées à aucun RUN.

## What Changes

Ajouter une troisième confirmation, décochée par défaut, lorsque seule la
preuve de clôture empêche la suppression d’une session de codage. CAB vérifie
de nouveau l’aperçu et les protections sous transaction avant d’effacer les
données exclusives du RUN, dont ses passages, cycles et mesures de tokens.
Il conserve les données partagées et un reçu minimal de l’action.
