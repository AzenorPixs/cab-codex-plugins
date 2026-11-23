# Reprendre un CICDF après une mise à jour des rapports de CAB

## Why

Un rafraîchissement des statistiques peut changer l’index partagé après
l’admission CICDF alors que le code livré est intact. Le refus avant
références laisse le reçu partiel. Cette évolution pérennise le mécanisme
qualifié avec le paquet local 3.8.4.

## What Changes

- Étendre l’inspection et la reprise du commit CICDF lorsque seules des
  entrées statistiques attestées ont évolué.
- Conserver l’arbre de code, la version, la projection et l’effet original.
- Qualifier les refus en présence de code divergent ou de preuve manquante.
