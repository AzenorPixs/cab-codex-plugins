# Préparation sans ambiguïté — CAB 2.2.37

## Why
PA01 a interprété une clé cache absente comme révision0, alors que son parent
porte11369, puis a envoyé un script composé court directement à shell ;
OpenCode expose7cibles et la garde refuse légitimement sa cible divergente.

## What Changes
Préciser maximum des révisions qui se recouvrent, absence de clé distincte de0,
et transport scellé des scripts composés même courts. Décrire le retrait
qualifié et la nouvelle unité sans modification des gardes ni anciens reçus.

## Scope
Documentation distribuée, cadrages, spécification documentaire et cohérence
version2.2.37. Aucun comportement runtime, permission ou état métier changé.
SCM,qualification ciblée,commit/publication/CABU ; code non attribué, ACL ultérieure.
