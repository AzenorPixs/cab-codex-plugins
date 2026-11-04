# Lectures natives et retrait refusé — CAB 2.2.26

## Why
Le retrait réel C12.33 sous2.2.25 a refusé sa frontière edit car trois lectures
natives path complétées étaient encore comptées comme effets supplémentaires.
La garde de rejet natif reste correcte ; la classification des observations
read V2 doit être explicitement qualifiée.

## What Changes
Dériver la provenance read depuis l’outil natif normalisé puis reconnaître
uniquement read completed/executed=false/path et fenêtre valides, sans
troncature. Shell/write, outil imitant read, read actif/échoué/non prouvé ou
input inconnu restent à qualifier et ne sont pas exclus des candidats.
Réutiliser les gardes et la route de retrait ; version2.2.26, SCM puis CABU.

## Scope
Client V2 et classification d’observation du contrôleur, tests, OpenSpec,
docs et versions. Aucune mutation Pixs depuis le correcteur, nouvelle
permission, libération ou rejeu. Le reçu409 précédent reste historique ; le
propriétaire prépare un actionId neuf après activation et nouvelles lectures.
Code non attribué ; ACL ultérieure.
