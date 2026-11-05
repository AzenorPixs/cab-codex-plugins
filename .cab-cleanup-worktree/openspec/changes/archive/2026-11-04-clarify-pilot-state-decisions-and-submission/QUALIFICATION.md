# Qualification SCM — CAB 2.2.21

4 novembre2026, Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node distribution, client, coordination, recovery, porte-mandat et CABU | 309 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 405 | 0 | 0 |

57 fichiers runtime du paquet (scripts, broker, Web, unités) sont identiques
au paquet2.2.20 installé après normalisation du seul numéro de version.
Les trois copies broker src concordent avec le paquet. Aucun nouveau moteur,
endpoint ou garde n’est créé. Contrôles syntaxiques :59Node et11Python,
70fichiers uniques ; py_compile avec cache privé. UTF-8/LF contrôlés.

Revue documentaire :54 situations et repli pour cas inconnu ;188 liens relatifs
présents ; budgets skill/commande<4000 et commande+status<10000.
Voir COVERAGE.md pour les dimensions et les limites des preuves.
Aucun test de texte en miroir n’a été ajouté. La campagne native isolée
vérifie la compatibilité du jeu distribué ; elle n’est pas une opération Pixs.

OpenSpec strict20/20 avant archive. Logs privés :
/home/ade/.codex/.tmp/cab-2221-{node,python,native,spec-before}.log.
Aucune modification des critères métier, autorisation, permission native,
RUN, checkpoint, accès ou bail Pixs depuis le correcteur. Publication/CABU
et reprise des propriétaires restent des étapes distinctes.
