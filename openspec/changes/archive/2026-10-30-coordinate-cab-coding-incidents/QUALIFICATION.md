# Qualification SCM — coordination des incidents CAB2.1.17

## Mandat et périmètre

Le développeur demande explicitement la règle de signalement au chat « Correctif CAB - OC », sa création si absent et la coordination jusqu’au correctif et à CABU, puis SCM avec incrément de version et CABU. Un seul change coordinate-cab-coding-incidents. Le chat réel existant a été retrouvé dans le projet CAB ; il est le chat courant, aucun doublon ou auto-message créé.

## Réalisation et limites

Référence unique coding-incidents.md distribuée dans le plugin et chargée par skill/commande. Recherche et réutilisation, création après absence vérifiée, ambiguïté/outil absent, signalement factuel filtré, propriétaire du RUN et suivi jusqu’aux versions réellement actives et notification sont documentés. La procédure relève de l’orchestrateur ; aucun envoi autonome par un service. Aucun algorithme, endpoint ou garde modifié. La création en absence est un contrat documentaire revu, pas une création artificielle déclarée comme test. Aucun incident réel provoqué pour vérifier la règle.

## Vérifications

Distribution ciblée32/32. Global Node588 :560 réussis,28 ignorés conditionnels,0 échec. Python80/80. Syntaxe59JavaScript et16Python ;36 fichiers exécutables reproduisent exactement leur empreinte2.1.16 après normalisation de la seule version. Copies broker identiques, UTF-8/LF. OpenSpec17/17 standard et strict avant archive. Le premier contrôle strict du delta a signalé deux exigences trop longues ; raccourcies avant distribution, contrôle strict réussi. Banc natif privé non réexécuté : aucun algorithme de transport/session n’a changé ; la preuve2.1.16 précédente reste historique et n’est pas comptée comme nouveau test.

Preuves ignorées : output/scm-incident-coordination/{distribution-targeted.log,node-global.log,python-global.log,source-verification.json,openspec-before-standard.log,openspec-before-strict.log}. Aucun test ajouté qui ne ferait que recopier la documentation.

## Matrice documentaire

| Élément | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé ; autorités, lecture, secrets, tests et Git appliqués. |
| PROJECT.md | Version2.1.17 et lien vers la procédure. |
| TECHNICAL.md | Version courante et coordination documentaire distinguée des services. |
| BUILD.md | Version commune et référence distribuée. |
| DEVOPS.md | Inchangé manuellement ; chemins Node/Python/OpenSpec et référentiel prompts relus. Une copie DEVOPS.sync-conflict-20261030-083115-RYJTBDK.md est arrivée concurremment : inventaire PHYSICAL antérieur, conservé sans édition dans le commit complet SCM ; il ne remplace pas DEVOPS.md courant PROXMOX et n’est pas utilisé comme cadrage. |
| DEVELOPMENT_MAP.md | Seule entrée provisoire du change, sans code ; état et liens amendés après archive. |
| openspec/BATCH_CODES.md | Même correspondance ciblée, attribution ACL ultérieure. |
| README.md | Version et lien de procédure publique. |
| CHANGELOG.md | Entrée2.1.17 ; historique2.1.16 conservé. |
| openspec/config.yaml | Inchangé, schéma spec-driven. |
| openspec/specs/codex-integration-distribution | Deux exigences ajoutées avec scénarios. |
| Plugin/skill/commande | Référence unique coding-incidents.md et mêmes consignes ; alias CABU/cab restent délégants. |
| Template/ORCHESTRATED_CODING.md/concurrent-runs.md | Aucune écriture ; concordance conservée par les contrôles de distribution. |

## Livraison et activation

Archive/statistiques/publications vérifiées séparément ; CABU coordonné à une frontière naturelle, sans désarmement/réarmement ni relance native implicite. La source ne prouve pas le runtime. Les versions réellement actives, la préservation des RUN et du processus OpenCode, puis l’information des sessions sont consignées après maintenance dans les sorties dédiées.
