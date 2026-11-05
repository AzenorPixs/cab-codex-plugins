# Annulation native formatée et diagnostics — CAB 2.2.27

## Why
PA01 a annulé nativement son PENDING sans effet, mais le registre reste PREPARED.
Le wrapper canonique possède seulement une mise en forme différente ; le matcher
compare des octets. Un wrapper diagnostic antérieur sans mutation est aussi
interprété comme non admissible au suffixe de preuve.

## What Changes
Comparer les tokens d’un gabarit fermé, en préservant exactement les chaînes,
arguments et identités ; tolérer seulement les blancs légaux et l’ordre des
clés de métadonnées sans changement de valeurs. Ignorer les diagnostics MCP
qualifiés sans effet, sans leur donner valeur de preuve d’annulation.
Conserver double lecture, quiescence, permission0, zéro accès/effet, résultat
CANCELLED/OC et invariants. Version2.2.27, SCM, publication puis CABU.

## Scope
Reconnaissance de preuve du contrôleur, tests, OpenSpec, docs et versions.
Aucun interpréteur JavaScript, nouvelle permission, annulation rejouée,
décision fabriquée ou mutation manuelle de RUN. Code non attribué ; ACL ultérieure.
