# Correction CABU des profils CLI — code non attribué

## Why

Le DEB3.2.6 reconnaît codex-cli dans l'inventaire mais sa validation du plan de
finalisation l'omet. Le postinst échoue après dépaquetage. Le développeur valide
la publication3.2.7 corrective, sans déplacer les tags ni effacer l'échec326.

## What Changes

Corriger le plan, qualifier le profil CLI enrôlé et permettre une transition
tracée du même RUN vers le patch suivant après un CABU FAILED avéré. Aucun
rejeu d'un effet UNKNOWN, aucun changement des exigences métier ni des producteurs.
