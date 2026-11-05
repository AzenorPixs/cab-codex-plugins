# Qualification SCM — CAB 2.1.10

## Autorité et état

Périmètre initial validé directement par le développeur le 29 octobre 2026 : un seul change, édition native et attente sans mandat, versions communes, tests isolés, documentation, archive et étapes Git SCM conditionnelles. CABU, services actifs, RUN Pixs et template restent exclus. La qualification source n’est pas une activation.

## Édition native

Binaire déclaré DEVOPS : `/home/devops/.opencode/bin/opencode`, version CLI observée `2.2.1`. Banc `tests/native-opencode-codemode.test.mjs`, serveur/fournisseur synthétique/broker/contrôleur privés, credentials synthétiques et nettoyage des processus dédiés. La chaîne positive a réussi avant toute modification de code runtime CAB, sous sources 2.1.9 ; rejouée ensuite sous les sources 2.1.10.

Catalogue transmis au modèle : edit, glob, grep, question, read, shell, skill, subagent, webfetch, websearch, write, execute. Signature native edit : `path`, `oldString`, `newString` requis ; `replaceAll` booléen facultatif et faux par défaut. Le search du banc ne retourne que des entrées MCP ; il n’inventorie pas ces natifs.

Preuve positive : demande d’un fichier sans commande, décision CAB explicite, accès write aux révisions observées, permission native edit de source vérifiée, once unique, fin completed, contenu final exact et release COMPLETED avec onceAcknowledged. Négatifs : demande native en attente sans écriture puis refus explicite ; ancien texte dupliqué avec replaceAll omis, erreur et contenu inchangé après once de test ; session avec deny shell/edit, tentatives forcées sans édition ni fichier sentinelle. Aucune adaptation de la logique du client n’a été nécessaire pour edit.

Commande réussie : `CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode /home/devops/node/current/bin/node --test tests/native-opencode-codemode.test.mjs` : 1/1. Client V2 : 17/17. Les premières tentatives ont révélé des erreurs de fixture (forme search non projetée, révision codée arbitrairement, attente de l’ambiguïté avant sa permission) ; corrigées sans affaiblir les invariants.

## Supervision

Le superviseur des RUN publie WAITING/orchestrator-mandate-required sans prompt OpenCode lorsque toutes les autres gardes permettent l’examen et qu’aucun mandat n’est déclaré. Les mandats existants, permissions non résolues, récupérations et accès restent prioritaires. Le mode historique sans RUN garde ses contrôles ; sa relance rappelle l’absence d’autorisation implicite.

`node --test tests/concurrent-supervisor.test.mjs tests/persistent-job-supervisor.test.mjs` : 16/16, dont armement sans mandat, prepare puis transfert de session et complete, analyse déjà déclarée, permission non résolue, accès actif, pause ciblée et indépendance des RUN. Distribution/documentation : 29/29.

## Extensions V2 et priorité de raisonnement validées

Le développeur a validé l’extension V2 puis demandé la priorité medium/high dans ce chat. Les corrections source suivantes ont été réalisées et testées :

- Retry : projection limitée aux enveloppes natives uniques request_validation/get_approval, metadata.error vrai, toolCalls en erreur concordant et absence de troncature. Pour le cas historique access_id vide seulement, identités exactes et génération courante, refus déterministe avant enregistrement, lookup natif inconnu corrélé et absence de demande locale permettent un prévol neuf dans la même candidate. Texte libre, lookup absent/divergent, arguments divergents, appel supplémentaire, troncature et refus non déterministe restent refusés. Le banc natif reproduit explicitement le schéma 2.1.9 pour cette erreur historique, avec validateur réel inchangé, puis réussit retry, commande corrigée sous once propre et complete.
- Schéma MCP : access_id non vide avec motif d’identité ; omettre la clé sans référence d’accès. Un test Python vérifie le refus avant persistance et l’absence d’approbation créée. La production de cette chaîne vide était une erreur d’agent ; la récupération non représentable et le schéma incomplet étaient les écarts CAB.
- Permissions : filtrage par session identifiée avant validation des cibles des contrôles propres au RUN, candidate incluse dès prepare. La lecture globale reste stricte. Permission étrangère multirésource isolée sans réponse ; identité absente, cible propre invalide et permission propre non résolue restent bloquantes.
- Télémétrie : tokens/coût top-level natifs validés et conservés dans info avec usageSource=opencode-v2 ; zéro conservé, valeurs absentes inconnues, mesures malformées refusées et métadonnées libres non autorisantes. Les événements V2 data/location et les identités durables sont normalisés ; début/fin d’exécution et permissions corrélés invalident la cohorte, les états statistiques suivent l’activité. Le skill de statistiques décrit session.text.delta, les tokens réels et l’absence de reconstruction historique.
- Raisonnement : medium par défaut, high sur le même modèle si medium est indisponible ; politique suivante seulement si les deux sont indisponibles. Un niveau explicitement imposé reste prioritaire. Le protocole des reprises exige frontière autorisée, variantes réellement publiées, prévol et réconciliation du contrat conservé, sans réarmement ni modification implicite d’une session active.

Le banc privé final annonce API 2.2.1, conforme au CLI 2.2.1. Son search edit annonce tools.opencode.models (helper interne), distinct du natif direct edit ; aucun résultat de découverte n’est utilisé comme preuve d’absence native. L’API partagée 2.2.0 et les quatre briques actives 2.1.9 n’ont pas été modifiées.

## Cohérence documentaire

| Document | État et preuve |
| --- | --- |
| Projet réel | Sources préparées 2.1.10 ; seule qualification isolée. Aucun CABU ni modification du raccord actif. |
| AGENTS.md | Inchangé : règles de racine, secrets, OpenSpec, validations et statistiques conservées. |
| PROJECT.md | Référence commune actualisée et section édition native/attente de mandat. |
| TECHNICAL.md | Référence commune et section édition native/attente, avec limites de qualification. |
| BUILD.md | Distribution commune et distinction source/activation. |
| DEVOPS.md | Inchangé : inventaire DIU daté, utilisé pour les chemins des binaires ; non régénéré. |
| DEVELOPMENT_MAP.md | Entrée provisoire ciblée avec liens du change et code non attribué ; attribution ACL ultérieure. |
| openspec/BATCH_CODES.md | Correspondance provisoire ciblée, aucun code inventé. |
| README.md | Référence commune et mode opératoire synthétique avec limites. |
| CHANGELOG.md | Entrée 2.1.10, édition native et attente sans mandat. |
| OpenSpec | Deltas transport V2, contrôleur, supervision, distribution et politique de modèle validés avant les adaptations ; archivage natif suivi séparément. |
| Skill et commande CAB | Signature edit directe, catalogue natif distinct de MCP, refus en lecture seule, réactivation PATCH/lecture/prompt V2 et attente de l’orchestrateur. |
| ORCHESTRATED_CODING.md | Inchangé : copie de protocole gérée par le référentiel template hors mandat. Son ancien exemple tools en lecture seule reste un écart externe préexistant signalé ; les consignes CAB V2 de ce change et le delta correspondant sont explicites. Aucune correction du template déduite de ce mandat. |

## Validation globale

Python global final : 75/75, journal `output/scm-native-edit/python-final.log`. Syntaxe JavaScript : 55 modules contrôlés ; syntaxe Python : 9 modules contrôlés. Node global final : 502 réussis, 28 ignorés, zéro échec (530 tests), journal `output/scm-native-edit/node-final.log`. Banc natif explicite : 1/1 réussi, journal `output/scm-native-edit/native-final.log`, API privée 2.2.1. Contrôleur concurrent : 105/105. Les 28 ignorés restent des bancs optionnels non activés dans la commande globale ; le banc natif de ce change est qualifié séparément. Aucun total ne les compte comme réussis.

OpenSpec, syntaxe et contrôles finaux sont recontrôlés avant archivage. Les premières attentes HTTP de politique mode2 ont été ajustées à la nouvelle priorité high explicitement demandée ; les contrôles d’authentification, quota et niveaux explicitement requis restent stricts. Les essais préparatoires non retenus ne sont pas confondus avec la campagne finale.

Validation finale : OpenSpec global standard et strict 17/17 chacun ; contrôle documentaire de distribution 29/29 après les dernières consignes ; syntaxe 55 modules JS et 10 Python avec Python DevOps ; copies broker identiques, UTF-8/LF et empreintes source contrôlés. Toutes les tâches de réalisation/validation sont cochées sur ces preuves. La synchronisation/archivage natifs, le rapport statistique et les étapes Git sont exécutés ensuite et rapportés séparément.

## Clôture native

Archivage natif réussi le 29 octobre 2026 : `2026-10-29-fix-native-edit-and-supervisor-mandates`. Synchronisation de cinq capacités : 11 exigences ajoutées et 9 modifiées, aucune supprimée. Un avertissement non bloquant recommande de découper au-delà de dix deltas ; le périmètre unitaire de remédiation 2.1.10 explicitement validé a été conservé. Aucun autre change archivé. Cartographie et registre ciblés actualisés, code non attribué conservé pour ACL ultérieur. Le rapport STATISTICS.md est produit ensuite, sans skill de pilotage ni sonde.

Le premier contrôle global strict après synchronisation a relevé deux avertissements de longueur devenus bloquants sur les exigences courantes. Correction documentaire minimale : texte de priorité medium/high condensé sans changer ses scénarios ; règle d’attente de mandat séparée de la relance historique dans une exigence propre, avec conservation des scénarios. Deltas de cette seule archive et specs courantes réconciliés, sans réarchivage ni modification d’une autre archive. Le code et ses empreintes restent identiques à la campagne finale.

Contrôles après correction documentaire : OpenSpec global standard 16/16, strict 16/16 ; distribution documentaire 29/29. Concordance des 21 exigences finales des deltas de cette archive avec les specs courantes vérifiée par normalisation des seuls espaces. Les 20 opérations de synchronisation initiales sont conservées comme preuve ; une exigence documentaire d’attente a ensuite été séparée (état final : 12 ajouts, 9 modifications). Empreintes du code identiques à la campagne finale, aucun nouveau test global justifié par cette séparation documentaire.
