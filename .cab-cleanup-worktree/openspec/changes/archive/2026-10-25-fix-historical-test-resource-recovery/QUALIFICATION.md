# Qualification SCM — compatibilité historique et récupération 1.10.1

Validation développeur : « Je valide », couvrant correction du lecteur et récupération en avant sous le même journal/HELD. Base 1.10.1 conservée ; plugin 1.10.1+codex.20261025160203. Aucun Git inspecté, préparé, commité ou publié.

## Résultats observés

- Tests ciblés ressources, mise à jour et distribution : 76/76 réussis.
- Suite Node complète : 397 cas, 371 réussis, 0 échec, 26 ignorés (25 bancs à ancien paquet 1.7.1 non fourni et 1 banc OpenCode natif optionnel non activé). Commande : node --test sur les 22 fichiers tests/*.test.mjs.
- Syntaxe : 25 contrôles Node et 1 py_compile réussis ; les deux fichiers modifiés après cette série ont été recontrôlés.
- Banc Docker réseau désactivé, deux UID réels 1000/1002 : échec de restauration reproduit sur une clé historique, puis récupération des quatre composants 1.10.1 dans la même transaction et génération. Registre HTTP 5 218 610 octets, privé 5 657 063 octets, 40 RUN et 256 ressources par RUN. OpenCode conservé ; écriture broker réellement interdite par le noyau.
- Refus observés : autorité/transaction, HELD, autre modification de code, pointeur inconnu et autorisation divergente. Interruption après plan et plan sans pointeur récupérés ; seconde réparation idempotente. Reçu, stages et anciennes releases préservés ; registre métier identique avant/après réparation.
- Copie privée du registre réel : 43 RUN, 3 063 opérations, 3 308 accès ; clé historique browser:c14-headless-test-profiles conservée ; empreinte identique après lecture. Aucune écriture du registre réel.
- Les nouvelles acquisitions de test non canoniques restent refusées. resource-coordination.mjs, update.mjs et commande /cab sont inchangés par ce correctif.

## Revue documentaire

| Document | État et preuve |
|---|---|
| AGENTS.md | Inchangé : règles de validation et archivage conservées. |
| PROJECT.md | Mis à jour : conservation des identités historiques et autorité de récupération. |
| TECHNICAL.md | Mis à jour : lecteur générique, gardes de test et réparation ciblée. |
| BUILD.md | Mis à jour : retrait du refus global erroné des anciennes clés, limites du retour et référence de réparation. |
| DEVOPS.md | Inchangé : outils et conteneur dédiés utilisés, aucune dépendance ajoutée. |
| README.md | Mis à jour : compatibilité et procédure de récupération 1.10.1. |
| CHANGELOG.md | Entrée 1.10.1 complétée. |
| ORCHESTRATED_CODING.md | Inchangé : aucun mandat ou protocole de permission assoupli. |
| OpenSpec | Deux deltas ciblés, validés strictement avant archive ; exigences RFC 2119. |

## Preuves et limites

Preuves reproductibles dans output/scm/fix-historical-test-resource-recovery : node-tests.log, syntax.json, two-uid-recovery.json, offline-reader.json et source-hashes.json. Les empreintes du périmètre sont jointes à PREUVES-SCM.json. Les données privées ne sont pas copiées dans l'archive.

Cette archive qualifie les sources. La récupération locale, les versions actives et la reprise des CISMP sont des opérations distinctes à constater après installation. Aucun test LXC physique ni nouvelle qualification fournisseur n'est revendiqué. L'outil refuse les layouts autres que les liens de fichiers et tout changement du candidat autre que le retrait exact du contrôle global fautif de runs.mjs.
