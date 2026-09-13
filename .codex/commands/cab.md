---
description: Piloter hors sandbox la communication de validation OpenCode–Codex
---

Réponds en français. Cette commande est globale : elle ne modifie jamais le projet OpenCode suivi, ses fichiers, ses spécifications ou sa configuration.

Le développeur accorde une autorisation permanente pour le cycle de vie et les vérifications propres à `/cab`. Ne sollicite donc pas de validation applicative supplémentaire pour lancer, initialiser, superviser, tester ou clôturer le pilotage. Respecte néanmoins toute autorisation technique que l’environnement impose lui-même pour une exécution hors sandbox.

Argument reçu : `$ARGUMENTS`

## Continuité du job

Après `/cab start`, conserver la session de codage active jusqu’aux critères de fin explicitement définis dans le contexte initial du job.

Ne jamais clore la réponse, arrêter le pilotage ou déclarer le travail terminé après un jalon intermédiaire : healthcheck, test POC, lot documentaire, diff, test unitaire ou réponse OpenCode.

Conserver le contexte initial du job comme source de vérité pendant toute la session : objectif, périmètre, spécifications OpenSpec, critères de validation, interdictions et délégations.

Un tour OpenCode achevé n’est jamais une fin de job. Tant que le job n’est ni
terminé, ni bloqué, ni explicitement arrêté, lire son dernier résultat dans la
session persistante et transmettre le mandat suivant dans cette même session.
Ne jamais envoyer de réponse finale au développeur pendant cet état RUN.

## Syntaxe

Les seules sous-commandes admises sont :

- `/cab start`
- `/cab run`
- `/cab stop`
- `/cab test`

Sans argument ou avec un argument inconnu, affiche cette syntaxe et n’effectue aucune action.

## Invariant de transport

Le flux normal est strictement le suivant :

```text
OpenCode ↔ cgpt-validation : MCP stdio local
cgpt-validation ↔ contrôleur Codex : HTTP/SSE local
OpenCode → contrôleur Codex : SSE HTTP direct
```

OpenCode lance `cgpt-validation` comme serveur MCP local `stdio`.

Le broker ne possède ni port MCP réseau, ni serveur MCP HTTP, ni SSE MCP exposé.

Le contrôleur Codex est local et s’exécute hors sandbox.

Le broker :
- corrèle les demandes par `requestId` ;
- persiste leur état ;
- notifie le contrôleur ;
- récupère les décisions ;
- restitue à OpenCode une réponse MCP corrélée ;
- ne décide jamais à la place de Codex ;
- ne modifie jamais le projet.

`broker_readiness` est l’interface synthétique de supervision.
`broker_health` reste réservé au diagnostic détaillé.

## `/cab start`

1. Vérifie qu’OpenCode répond sur `127.0.0.1:4096`.
2. Vérifie que la configuration OpenCode déclare `cgpt-validation` comme serveur MCP local `stdio`.
3. Consulte l’état MCP du serveur OpenCode par `GET /mcp`. Cette API est la seule source de vérité pour les sessions persistantes ; une sortie de CLI ou un état mémorisé ne suffit pas.
4. Si `cgpt-validation` n’est pas `connected`, demande une réinitialisation contrôlée de l’instance OpenCode par `POST /instance/dispose`, sans tuer ni démarrer directement le processus broker. Attends ensuite une nouvelle réponse saine de `/global/health` et `cgpt-validation: connected` dans `/mcp`. En cas d’échec, publie `CAB_INACTIF` avec l’erreur observée et n’ouvre aucune session de codage.
5. Démarre ou réutilise le contrôleur Codex persistant hors sandbox sous `oc-cgpt-validation-controller.service`, avec `OC_Codex_OUTSIDE_SANDBOX=1` ; l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1` reste accepté.
6. Vérifie le contrôleur Codex sur son interface locale.
7. Établit et maintient le SSE HTTP direct OpenCode `/global/event`.
8. Crée ou réutilise une unique session de codage OpenCode persistante avec l’API native `POST /session`. Conserve et affiche son identifiant ; elle est l’unique canal des mandats de codage jusqu’à la clôture du job.
9. Adresse les mandats exclusivement à cette session via `POST /session/<id>/message`. Aucun appel CLI éphémère ne peut transmettre ou exécuter un mandat de codage. La session doit rester visible au développeur dans OpenCode.
10. Dans cette session, appelle `broker_readiness` sans lecture, commande ni écriture du projet.
11. Accepte comme états possibles : `READY`, `DEGRADED`, `BLOCKED`, `HUMAN_REQUIRED`.
12. Après reconnexion SSE ou divergence détectée, réconcilie l’état réel via HTTP auprès d’OpenCode, puis recontrôle `/mcp` avant tout nouveau mandat.
13. Crée ou réactive le heartbeat global « Surveillance CAB » toutes les 30 secondes.
14. Le heartbeat surveille OpenCode, `/mcp`, `broker_readiness`, le contrôleur et le SSE OpenCode.
15. Le heartbeat reste silencieux lorsque tout est sain et ne prend aucune décision de validation.
16. Publie `CAB_ACTIF` uniquement si les preuves suivantes sont présentes :
    - OpenCode sain ;
    - MCP `cgpt-validation` connecté ;
    - `broker_readiness` exploitable ;
    - contrôleur Codex joignable ;
    - SSE OpenCode `connected` ;
    - heartbeat actif.
17. Toute preuve absente impose `CAB_INACTIF`.
18. Avant le premier pilotage réel après démarrage, exécute obligatoirement `/cab test`.

Une simple réponse HTTP, un ancien état MCP ou une ancienne session de test ne suffit jamais à déclarer `CAB_ACTIF`.

## `/cab run`

Exécute un job piloté dans la session persistante après un `/cab start` et un
`/cab test` réussis.

1. Constitue un contrat de job unique : `requestId`, `approval_id`, `change_id`,
   objectif, session OpenCode, répertoire cible, fichiers relatifs autorisés,
   commandes exactes autorisées et critères de fin.
2. Demande la validation CAB de ce contrat complet avant tout mandat d’écriture
   ou de commande. Aucun périmètre non déclaré ne peut être ajouté après cette
   validation.
3. Après réponse MCP `approved` corrélée, le broker transmet ce périmètre au
   contrôleur. Le contrôleur répond alors automatiquement aux seules permissions
   natives OpenCode de cette session correspondant exactement à un fichier ou à
   une commande du contrat, avec la réponse native `once`.
4. Une permission hors session, hors fichier, hors commande ou hors contrat
   reste en attente et doit être remontée comme écart ; elle n’est jamais
   acquittée par CAB.
5. Après chaque tour de l’agent de codage, contrôle la session persistante. Si
   le contrat n’est pas terminal, envoie le mandat suivant sans créer de session
   éphémère et sans conclure la réponse Codex.
6. Le job devient terminal uniquement si tous ses critères sont satisfaits, si
   CAB retourne `BLOCKED` ou `HUMAN_REQUIRED`, ou si le développeur l’arrête
   explicitement. À ce moment seulement, publie le bilan final puis clôture le
   contrat côté CAB.

## `/cab test`

Exécute un test non destructif après `/cab start`.

Utilise la session de codage persistante créée par `/cab start`. Ne crée pas de session éphémère : le test et les mandats ultérieurs doivent rester observables au même endroit. Le test ne demande ni lecture, ni commande, ni écriture du projet.

1. Vérifie OpenCode : `OK` ou `NOK`.
2. Vérifie par `GET /mcp` que `cgpt-validation` est `connected` comme MCP local `stdio`.
3. Vérifie que l’identifiant de la session persistante est connu et que la session reste accessible par l’API native OpenCode.
4. Appelle `broker_readiness` dans cette session par `POST /session/<id>/message`.
5. Interprète strictement :
   - `READY` → continuer ;
   - `DEGRADED` → afficher `root_cause` et `recommended_action`, continuer seulement si le test actif reste sûr ;
   - `BLOCKED` → arrêter immédiatement en `NOK` ;
   - `HUMAN_REQUIRED` → arrêter et signaler l’intervention humaine requise.
6. Vérifie le contrôleur Codex et le SSE direct OpenCode actifs.
7. Vérifie qu’aucune demande d’approbation parasite n’est en attente.
8. Dans la même session persistante, demande à OpenCode de produire une validation non destructive sur `cgpt-validation` avec un `requestId` unique.
9. Codex rend une décision explicite unique `approved`.
10. Vérifie dans cette session qu’OpenCode reçoit la réponse MCP corrélée.
11. Vérifie l’accusé de réception OpenCode via le SSE direct.
12. En cas de reconnexion ou divergence, confirme l’état réel par HTTP puis recontrôle `/mcp` avant de reprendre le test.

Affiche une coche verte uniquement pour une preuve réellement observée dans la session courante.

En cas d’échec, affiche :
- `NOK` ;
- le `requestId` concerné si disponible ;
- `root_cause` si disponible ;
- `recommended_action` si disponible ;
- la cause précise.

N’annonce jamais une réussite partielle comme un test validé.

À la fin du test, conserve la session persistante pour le job. Ne clôture que les ressources temporaires propres au test.

Ne ferme jamais :
- le broker MCP stdio principal ;
- OpenCode ;
- le contrôleur persistant ;
- le heartbeat global.

## `/cab stop`

1. Supprime tous les heartbeats et cron healthchecks créés par `/cab`, dont « Surveillance CAB ».
2. Ferme les flux SSE ouverts par `/cab`.
3. Arrête proprement uniquement les processus de contrôleur démarrés par `/cab`, notamment `oc-cgpt-validation-controller.service`.
4. Ne tente pas d’arrêter directement `cgpt-validation` : son cycle de vie appartient à OpenCode.
5. Ne ferme jamais OpenCode sauf instruction explicite du contexte initial ou du développeur.
6. Affiche le bilan : éléments arrêtés, éléments préservés et éventuelles erreurs.
