# Qualification source — CAB2.1.20

Mandat SCM du correctif de raccord à chaud, précisé par les retours des sessions autorisées. Sans choix explicite, la PLLM actuelle gouverne la sélection ; un choix explicite de fournisseur/modèle/raisonnement reste indépendant de l’ancienne politique. Aucune adoption sur un RUN réel n’est déduite de cette qualification.

## Lanceur et résultats d’adoption

La comparaison des chemins réels corrige l’entrée du helper lorsqu’il est lancé par lien symbolique. Le vrai CLI est testé sur chemin canonique puis lien, avec une transmission privée, un seul effet et un seul reçu par invocation. Un import ne lance pas le main. Les résultats de transition terminée, y compris une lecture idempotente, indiquent désormais historicalContinuity=not-verified et requiresHistoricalContinuityCheck=true. Ces champs ne changent pas le schéma persisté des jobs.

## Historique lié au compte : résultat natif

Le banc privé utilise le binaire officiel OpenCode2.2.0, un faux endpoint Responses sur loopback et des marqueurs chiffrés synthétiques. Le compte B répond à une session neuve. Sur le même SID historique, le même fournisseur et le même modèle, les métadonnées opaques du compte A sont rejouées : réponse400 « encrypted_content was not issued to this caller ». Le refus n’est pas classé comme indisponibilité du raisonnement.

resume:false admet durablement une entrée mais ne relance pas la génération ; la prochaine génération normale échoue encore. Un autre modèle réellement configuré et explicitement sélectionné réussit dans ce banc sans outil, avec le checkpoint textuel et les enregistrements historiques conservés. Revenir au modèle initial réintroduit les anciennes métadonnées et échoue. Un simple aller-retour de modèle ne constitue donc pas une réparation. Le PID, le SID et les enregistrements initiaux restent identiques ; aucun contenu historique chiffré réel n’a été lu.

L’implémentation native2.2.0 réutilise les métadonnées lorsque fournisseur et identifiant de modèle correspondent ; cette condition ne distingue pas les comptes. Aucun contrôle HTTP qualifié dans ce périmètre ne permet d’invalider sélectivement ces métadonnées pour le même modèle. La limite livrée concerne ce parcours qualifié et cette version, sans prétendre exclure toute extension native future. Un autre modèle est seulement une possibilité à qualifier sur l’historique réel, par son propriétaire, sous permissions deny et mandat corrélé. Aucun compactage, nouveau SID, dispose, édition de stockage ou changement de politique automatique n’est appliqué.

Sources publiques : [reconstruction native des messages2.2.0](https://github.com/anomalyco/opencode/blob/v2.2.0/packages/core/src/session/runner/to-llm-message.ts), schéma HTTP public du serveur2.2.0. L’archive officielle du binaire de banc est vérifiée par SHA2566d597970a8cc448f1b9a9f645532584b339dd3ab9583bb5f063f13d83e54768f. Le banc ne nécessite aucun compte payant réel.

## Vérifications finales

| Vérification | Résultat final |
|---|---|
| Node, groupe concurrent | 132 réussis,0 échec,32,543845s |
| Node, autres fichiers disjoints | 470 réussis,30 ignorés conditionnels,0 échec,55,081065s |
| Node global | 632 cas uniques,602 réussis,30 ignorés conditionnels,0 échec |
| Python global | 80 réussis,0 échec |
| Binaire natif privé2.2.0, trois bancs | 3 réussis,0 échec,12,247024s |
| Syntaxe | 65 fichiers JavaScript et16 Python |
| Copies broker | Identiques |
| Textes concernés | UTF-8 et LF |
| OpenSpec avant archive | Cible stricte réussie ; global standard et strict17/17 |

Les suites ciblées sont incluses dans le bilan global et ne s’y ajoutent pas. Les trois exécutions natives explicites sont distinctes des cas conditionnellement ignorés dans le passage Node par défaut. Les durées de groupes ne sont pas assimilées à une durée murale totale de la SCM. Les compteurs de tests ne constituent pas une mesure de production LLM.

AGENTS.md, DEVOPS.md, ORCHESTRATED_CODING.md et la référence concurrent-runs restent aux empreintes relevées avant intervention. Aucun template modifié. Les preuves détaillées régénérables sont conservées sous output/scm-history-continuity, ignoré par Git. Les premières mises au point du nouveau banc ont corrigé ses fixtures Responses et son attente de fin native ; aucune assertion de conservation ou de sécurité n’a été supprimée. La clôture SCM maintient également les statistiques globales existantes selon SGS1.11, sans réécrire les rapports historiques.
