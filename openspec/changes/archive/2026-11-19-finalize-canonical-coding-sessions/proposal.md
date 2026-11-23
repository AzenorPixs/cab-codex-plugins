# Finaliser les sessions canoniques sans dossier de change

## Why
Une livraison canonique admise sans dossier de change reste FINALIZING : le rapport requis dépend exclusivement d’un ChangeSource absent. La consultation indique néanmoins READY et masque closure-report-required.

## What Changes
- Un RUN de livraison cadré sur une spécification canonique réelle peut publier son rapport dans statistics/runs/<identité>/STATISTICS.md, sans inventer change, tâches ou archive.
- CAB utilise les seules périodes et preuves de ce RUN, conserve les absences en N/A, projette le maître local en PG et l’intègre au global sans double compte.
- Le moteur de commit terminal existant publie ces documents et vérifie les destinations avant CLOSED, sans rejouer la livraison.
- La consultation expose les blocages réels survenus après constitution du dossier.

## Impact
Finalisation, publication statistique, commit terminal et tests ciblés. Aucune nouvelle migration ou dépendance. Un ancien dossier de change disparu ne devient pas une session canonique.
