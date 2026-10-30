# Isolation de la location MCP partagée

## Why

Un workspace technique de sonde peut initialiser un contexte MCP concurrent et prendre le singleton du broker partagé. Les méthodes MCP ignorent leur argument de répertoire et la découverte serveur transporte un en-tête de workspace implicite. Le développeur valide le correctif générique sous SCM avec incrément, puis CABU et information des sessions ; les exemples ne doivent nommer aucun projet consommateur.

## What Changes

Source commune 2.1.14. Découverte globale sans scope de workspace ; cibles MCP divergentes refusées avant contrôle ; helper de création de sonde jetable dans la location MCP partagée avec permissions deny. Ciblage explicite du POST de création de session. Appelants internes MCP sans argument trompeur. Documentation de prévention, de nettoyage des seules sessions de sonde et de récupération native explicite d’un contexte concurrent ; aucune reconnexion automatique. Qualification sur fixtures isolées et serveur OpenCode privé, archive, statistiques et publications SCM, puis activation CABU explicitement autorisée.

## Impact

Modules client, appelants de maintenance/job/moniteur, tests du client et banc natif privé ; trois capacités OpenSpec, documentation et versions communes. Génération, mandats, décisions, accès, RUN, secrets et processus OpenCode préservés. Les quatre désignations explicites d’un projet consommateur dans les sources courantes sont généralisées. Les identifiants officiels des dépôts de distribution et les preuves historiques restent exacts. Aucun template ni copie ORCHESTRATED_CODING.md modifié.
