# Qualification — raccord Code Mode 2.1.8

## Périmètre et preuves natives

Extension SCM explicitement validée par le développeur le 29 octobre 2026. Le binaire déclaré dans DEVOPS.md, `/home/devops/.opencode/bin/opencode`, annonce 2.2.0. Le banc utilise une instance privée, un fournisseur synthétique loopback et des credentials de test ; aucune configuration, donnée ou clé de l'instance partagée n'est copiée.

Les observations natives établissent : les outils MCP passent par execute et metadata.toolCalls ; shell est un outil direct ; shell et write terminent réellement avec executed faux. La permission shell expose commande et source d'appel ; la permission write expose un chemin relatif qui doit être rapproché de l'appel source et du workspace. Le raccord ne déduit aucune exécution du seul drapeau executed.

Le test `tests/native-opencode-codemode.test.mjs` vérifie la découverte, readiness, request_validation, décision explicite du contrôleur de test, accès HELD, permission native once acquittée, shell /usr/bin/true avec exit 0, fin d'accès et recovery complete. Il exerce ensuite une écriture réelle du seul fichier temporaire prévu, sous mandat et once distincts, et vérifie contenu et fin corrélée. Le nettoyage vérifie la disparition du broker avant suppression des fichiers temporaires. Trois répétitions fixes du banc ont passé ; elles ne sont pas additionnées aux mesures uniques.

## Contrôles

| Contrôle | État observé |
| --- | --- |
| Client V2 et refus Code Mode | 17/17, avec transformation, expression, argument divergent, appel caché, troncation, ombrage de tools et provenance fabriquée refusés |
| Client + recovery + banc OpenCode réel | 63/63 avant campagne globale |
| Contrôleur concurrent | 93/93 après précondition SSE authentifiée de la fixture |
| Configuration historique | 27/27 après correction de l'accès optionnel à operation.kind |
| Python DevOps | 74/74 |
| Syntaxe et intégrité | 38 modules Node et 11 fichiers Python ; 81 fichiers UTF-8/LF ; copies broker identiques ; empreintes du code identiques à celles de la campagne globale finale |
| OpenSpec | Change strict valide et global strict 17/17 avant archive |
| Global Node final | 513 tests : 487 réussis, 26 ignorés, 0 échec ; source stable par empreintes, durée 85,159 s ; journal `output/scm-codemode/node-global-stable.log` |

La relecture sans effet de la candidate CISMP7 prouve que le préfixe des cinq outils directs garde exactement son empreinte, que les cinq enveloppes nouvelles sont reconnues et qu'aucune commande n'a été exécutée. Ce contrôle n'est ni une réconciliation ni une reprise du RUN.

## Échecs intermédiaires et corrections

- Le premier prototype utilisait tools.shell dans Code Mode : le serveur l'a refusé. Le contrat a été corrigé pour le véritable outil direct shell.
- Une règle ask globale dans le banc bloquait aussi les appels MCP diagnostiques. Le banc demande explicitement ask pour shell, bash et edit, en conservant l'admission CAB des opérations exécutables.
- Une première enveloppe de readiness et une recherche initiale n'ont pas été reconnues dans certains essais. Le banc attend désormais la disponibilité effective du catalogue par des découvertes diagnostiques bornées avant le prévol. Les programmes et preuves inconnus restent refusés.
- Deux tests historiques recevaient 400 : un nouveau paramètre par défaut déréférençait une opération absente avant la garde du job non armé. L'accès optionnel préserve ce cas et les 27 tests concernés passent.
- Deux campagnes globales ont relevé des symptômes intermittents dans la fixture concurrente : session native indisponible, puis expiration du démarrage. Le fichier passe isolément. La fixture attend maintenant la connexion SSE authentifiée avec identité PID/workspace vérifiées, requête bornée et attente de démarrage de dix secondes. Les assertions métier et les refus n'ont pas été supprimés ; la cause système initiale n'est pas affirmée.

Les journaux et diagnostics restent dans output/scm-codemode/, hors Git. Aucun saut optionnel n'est assimilé à une réussite. Les profils historiques à paquet original non fourni restent distincts de la qualification OpenCode 2.2 actuelle.

## Matrice documentaire

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé : priorité des règles, spécifications et validations SCM conservées |
| PROJECT.md | Version source 2.1.8 et frontière des preuves natives décrites |
| TECHNICAL.md | Grammaire bornée, origine des parties, shell/write, permissions, rejet et limites explicités |
| BUILD.md | Distribution commune et qualification native isolée ; archive et publication avant CABU |
| DEVOPS.md | Inchangé : inventaire daté ; binaires OpenCode, Node/Python et OpenSpec réutilisés, aucune dépendance ajoutée |
| ORCHESTRATED_CODING.md | Inchangé : rôles, mandats et once conservés ; détails du transport dans le skill CAB courant, sans réécriture du référentiel partagé |
| README.md | Version courante et procédure Code Mode documentées |
| CHANGELOG.md | Entrée 2.1.8 avec comportements, compatibilité et refus |
| Skills, références et commandes CAB/CABU | Jeu courant aligné et protocole natif documenté ; procédure unique CABU conservée |
| DEVELOPMENT_MAP.md / BATCH_CODES.md | Entrée provisoire sans code, progression et liens du seul correctif amendés ; aucune attribution implicite |

## Procédure après qualification source

Synchroniser et archiver ce seul change, vérifier STATISTICS.md, puis appliquer les étapes Git SCM configurées. Exécuter CABU depuis la source GitHub publiée et vérifier les quatre processus 2.1.8, commandes, workspace et processus OpenCode préservé. Dans la candidate conservée, rétablir les règles natives shell ask, sceller le rejet historique avec l'autorisation déjà acquise et un identifiant de prévol neuf, puis exiger le nouveau prévol complet avant complete. Reprendre seulement ensuite PA01 au premier jalon non prouvé. Les états et permissions antérieurs ne sont jamais rejoués ou édités manuellement.

Les 26 ignorés exigent CAB_TEST_ORIGINAL_PLUGIN (paquet historique 1.7.1 non fourni). CAB_TEST_OPENCODE a été explicitement fourni : les deux scénarios natifs actuels ont été exécutés, dont celui du présent raccord. Les tests uniques réussis sont 561 = 487 Node + 74 Python ; les répétitions et sous-ensembles ne sont pas additionnés.

Contexte opérationnel avant CABU : les quatre composants partagés sont encore observés en 2.1.7 dans le workspace Pixs et le gel global est RELEASED. Le changement 2.1.7 est donc installé ; cette observation ne prouve pas la reprise PA01, suspendue au raccord Code Mode. La présente source 2.1.8 attend son archivage et son déploiement.
