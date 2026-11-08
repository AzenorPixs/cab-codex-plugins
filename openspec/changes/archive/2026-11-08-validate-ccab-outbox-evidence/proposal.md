# Valider et réparer les preuves de l’outbox CCAB

## Why

Une déclaration dont les empreintes ne respectent pas le schéma central peut être mise en outbox locale puis refusée indéfiniment au relais. Une relance identique ne la corrige pas.

## What Changes

Valider les preuves avant toute nouvelle mise en file. Permettre à l’émetteur de corriger uniquement les preuves invalides d’un paquet historique, avec même identité et tous les autres champs inchangés ; conserver l’horodatage et les autres entrées. Relayer puis acquitter seulement après succès.
