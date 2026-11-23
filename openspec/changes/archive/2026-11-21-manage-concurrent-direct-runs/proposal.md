# Isoler les RUN directs et annuler les cadrages remplacés

## Why

Un arrêt technique a laissé un cadrage jamais exécuté parmi les sessions
actives alors que son successeur avait livré le change. Un SID Codex doit
aussi permettre plusieurs travaux indépendants sans cible Git ambiguë.

## What Changes

CAB annule un cadrage direct remplacé sur preuves et conserve son lien
vers le successeur. Le connecteur peut desservir plusieurs RUN directs
du même journal natif vérifié. Les états de session sont courts et en anglais.
