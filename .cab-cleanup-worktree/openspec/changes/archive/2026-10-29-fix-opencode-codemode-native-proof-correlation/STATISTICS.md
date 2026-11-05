# Statistiques — raccord Code Mode CAB 2.1.8

Projet CAB. Change `fix-opencode-codemode-native-proof-correlation`, code non attribué. Extension SCM directe validée par le développeur le 29 octobre 2026 ; un agent Codex, aucune délégation. Ce rapport est établi après archivage et couvre la qualification source. Publications, CABU et reprise réelle PA01 sont suivis séparément.

## 1. Statistiques générales et décisions

5/5 tâches source validées. Campagne finale : **561 tests uniques réussis = 487 Node + 74 Python**, 26 scénarios optionnels ignorés, aucun échec final. Total avec ignorés : 587 = 513 Node + 74 Python. Les sous-ensembles et répétitions ne sont pas additionnés.

Le développeur a validé l'extension SCM avec version 2.1.8, archivage, publication, CABU puis reprise du même RUN PA01. Les bornes exhaustives de durée, tokens, coût, quotas et nombre de messages : N/A, aucune collecte de pilotage déclenchée dans ce mandat SCM direct. Aucun nouveau RUN CAB réel créé pour le correctif.

## 2. Types de messages et d'outils

Recherches et lectures ciblées, édition, commandes Node/Python, HTTP local filtré et OpenSpec. Les décisions de qualification sont simulées dans les bancs privés ; elles ne sont pas des permissions sur le RUN réel. Aucune ancienne décision ou once n'a été rejouée. Comptages exhaustifs des messages et appels d'outils : N/A, sans reconstruction rétroactive.

## 3. Fichiers modifiés

Client OpenCode V2 : grammaire de données, projection Code Mode, origine des enveloppes et vérification des permissions sources. Contrôleur : preuve native shell/write sous once. Contexte de job : contrôles shell ask, diagnostics de découverte et rejet après interruption. Tests du client, recovery, contrôleur concurrent et nouveau banc `native-opencode-codemode.test.mjs` ; helper V2 étendu pour représenter les vrais formats.

Distribution commune 2.1.8 : 62 fichiers de versions/manifestes/commandes et copies broker alignés. Cadrages, README.md, CHANGELOG.md, références CAB et cartographies amendés ; deltas OpenSpec et présente archive. AGENTS.md, ORCHESTRATED_CODING.md et DEVOPS.md restent inchangés avec motifs dans [QUALIFICATION.md](QUALIFICATION.md). Aucun fichier métier Pixs modifié par ce correctif.

## 4. Commandes et validations

| Contrôle | Résultat observé |
| --- | --- |
| node --test tests/opencode-v2-client.test.mjs | 17/17 ; programmes, données, provenance ou sources divergents refusés |
| Client + recovery + OpenCode natif | 63/63 ; sous-ensemble de la campagne globale |
| node --test tests/concurrent-controller.test.mjs | 93/93 après précondition SSE de la fixture |
| node --test tests/controller-configuration.test.mjs | 27/27 après correction du cas sans opération |
| Node global, --test-concurrency=1, CAB_TEST_OPENCODE explicite | 513 : 487 réussis, 26 ignorés, 0 échec ; 85,159 s ; empreintes source stables pendant puis après les tests |
| Python DevOps unittest discover | 74/74 |
| Syntaxe et intégrité | 38 modules Node, 11 fichiers Python ; 81 fichiers UTF-8/LF ; copies broker identiques |
| OpenSpec avant archive | Change strict valide ; global strict 17/17 |
| Archive native | Réussie : 3 exigences ajoutées, 6 modifiées, 1 renommée ; aucun retrait |

Les deux bancs OpenCode natifs ont réellement tourné sur le binaire 2.2.0 dans des instances isolées. Le nouveau banc vérifie MCP Code Mode, décision corrélée, HELD, shell ask/once, exit 0, release et recovery complete, puis une écriture exacte sous once distincte. Il vérifie aussi la disparition du broker avant nettoyage. Trois répétitions fixes réussies ne sont pas ajoutées au total unique.

Les 26 ignorés nécessitent CAB_TEST_ORIGINAL_PLUGIN et le paquet historique 1.7.1 non fourni ; aucune nouvelle qualification réelle de ces anciens profils mixtes n'est déduite. Les observations et corrections intermédiaires sont détaillées dans QUALIFICATION.md : mauvais nom d'outil système du prototype, ask trop global dans le banc, catalogue initial non disponible, opération absente dans deux cas historiques, puis symptômes intermittents de démarrage de la fixture. Aucun contrôle métier n'a été supprimé. Journaux conservés sous `output/scm-codemode/`, hors Git.

La lecture sans effet de la candidate réelle confirme le préfixe historique de cinq outils inchangé, les cinq enveloppes nouvelles reconnues et zéro commande exécutée. Elle ne prouve pas le recovery réel.

## 5. Accès web

Consultation ciblée de sources primaires OpenCode pour le format Code Mode et le contrat V2. Les observations déterminantes proviennent du serveur 2.2.0 isolé et des APIs natives. Référence : [Code Mode officiel](https://github.com/anomalyco/opencode/blob/dev/packages/codemode/README.md). Nombre exhaustif des requêtes web : N/A, sans télémétrie reconstruite. Les bancs de qualification utilisent uniquement des services loopback et des credentials synthétiques.

## 6. Synthèse globale

La source CAB 2.1.8 est qualifiée et archivée. Elle reconnaît seulement les enveloppes Code Mode bornées et concordantes, conserve la provenance et les refus, et vérifie les véritables permissions et fins natives de shell/write. Les anciens préfixes et le retry ordinaire sont préservés. La qualification source ne vaut ni installation ni reprise PA01. Le commit, les publications, CABU, les versions actives et le nouveau prévol réel restent à constater séparément après ce rapport.
