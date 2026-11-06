# Effacement qualifié d’un change historique multi-propriétaire

Code non attribué ; convergence ACL ultérieure. Correctif demandé dans le mandat permanent SCM après refus de cleanup C12 libéré, sans contournement des historiques.

## Why
Le scope d’effacement couvre tous les RUN du change mais exige un ownerId unique ; un ancien RUN temporaire conservé empêche donc la clôture. L’éligibilité des anciens jobs ne doit pas être confondue avec le gate de clôture final du change.

## What Changes
Ajouter un prévol sans effacement renvoyant les liaisons exactes RUN/contexte/version/propriétaire et leur empreinte. Une revue explicite, bornée au mandat existant du change, autorise cet inventaire exact ; le défaut mono-propriétaire reste strict. Vérifier la revue à prepare et seal, sans réécrire aucun owner. Le dernier contexte du change, propriété de l’orchestrateur de clôture, doit avoir le gate final validé et être désarmé. Les anciens contextes inclus doivent être libérés, désarmés et sans effets/ressources/permissions non soldés ; ils ne reçoivent aucun gate fictif. Inventaire natif complet, transaction signée, effacement authentifié et préservation des pairs restent exigés.

Périmètre : scope/manager/pilote cleanup, route de prévol, tests multi-RUN et multi-owner, documentation distribuée, versions et cadrages nécessaires. Version2.3.9, tests, archive/SGS, DIU puis CABU vérifié avant reprise du cleanup officiel par C12. Aucune suppression manuelle ni RUN de substitution.
