---
description: Piloter hors sandbox la communication de validation OpenCode–CGPT
---

Réponds en français. Cette commande est globale : elle ne modifie jamais le projet OpenCode suivi, ses fichiers, ses spécifications ou sa configuration.

Le développeur accorde une autorisation permanente pour le cycle de vie et les vérifications propres à `/cab`. Ne sollicite donc pas de validation applicative supplémentaire pour lancer, initialiser, superviser, tester ou clôturer le pilotage. Respecte néanmoins toute autorisation technique que l’environnement impose lui-même pour une exécution hors sandbox.

Argument reçu : `$ARGUMENTS`

## Continuité du job

Après `/cab start`, conserver la session de codage active jusqu’aux critères de fin explicitement définis dans le contexte initial du job.

Ne jamais clore la réponse, arrêter le pilotage ou déclarer le travail terminé après un jalon intermédiaire : healthcheck, test POC, lot documentaire, diff, test unitaire ou réponse OpenCode.

Conserver le contexte initial du job comme source de vérité pendant toute la session : objectif, périmètre, spécifications OpenSpec, critères de validation, interdictions et délégations.

## Syntaxe

Les seules sous-commandes admises sont :

- `/cab start`
- `/cab stop`
- `/cab test`

Sans argument ou avec un argument inconnu, affiche cette syntaxe et n’effectue aucune action.

## Invariant de transport

Le flux normal est strictement le suivant :

```text
OpenCode ↔ cgpt-validation : MCP stdio local
cgpt-validation ↔ contrôleur CGPT : HTTP/SSE local
OpenCode → CGPT : SSE HTTP direct
```

OpenCode lance `cgpt-validation` comme serveur MCP local `stdio`.

Le broker ne possède ni port MCP réseau, ni serveur MCP HTTP, ni SSE MCP exposé.

Le contrôleur CGPT est local et s’exécute hors sandbox.

Le broker :
- corrèle les demandes par `requestId` ;
- persiste leur état ;
- notifie le contrôleur ;
- récupère les décisions ;
- restitue à OpenCode une réponse MCP corrélée ;
- ne décide jamais à la place de CGPT ;
- ne modifie jamais le projet.

`broker_readiness` est l’interface synthétique de supervision.
`broker_health` reste réservé au diagnostic détaillé.

## `/cab start`

1. Vérifie qu’OpenCode répond sur `127.0.0.1:4096`.
2. Vérifie que la configuration OpenCode déclare `cgpt-validation` comme serveur MCP local `stdio`.
3. Vérifie que `cgpt-validation` est connecté.
4. Appelle `broker_readiness`.
5. Accepte comme états possibles : `READY`, `DEGRADED`, `BLOCKED`, `HUMAN_REQUIRED`.
6. Démarre ou réutilise le contrôleur CGPT persistant hors sandbox sous `oc-cgpt-validation-controller.service`, avec `OC_CGPT_OUTSIDE_SANDBOX=1`.
7. Vérifie le contrôleur CGPT sur son interface locale.
8. Établit et maintient le SSE HTTP direct OpenCode `/global/event`.
9. Après reconnexion SSE ou divergence détectée, réconcilie l’état réel via HTTP auprès d’OpenCode.
10. Crée ou réactive le heartbeat global « Surveillance CAB » toutes les 30 secondes.
11. Le heartbeat surveille OpenCode, `broker_readiness`, le contrôleur et le SSE OpenCode.
12. Le heartbeat reste silencieux lorsque tout est sain et ne prend aucune décision de validation.
13. Publie `CAB_ACTIF` uniquement si les preuves suivantes sont présentes :
    - OpenCode sain ;
    - MCP `cgpt-validation` connecté ;
    - `broker_readiness` exploitable ;
    - contrôleur CGPT joignable ;
    - SSE OpenCode `connected` ;
    - heartbeat actif.
14. Toute preuve absente impose `CAB_INACTIF`.
15. Avant le premier pilotage réel après démarrage, exécute obligatoirement `/cab test`.

Une simple réponse HTTP, un ancien état MCP ou une ancienne session de test ne suffit jamais à déclarer `CAB_ACTIF`.

## `/cab test`

Exécute un test non destructif après `/cab start`.

Utilise une session OpenCode de test isolée et ne demande ni lecture, ni commande, ni écriture du projet.

1. Vérifie OpenCode : `OK` ou `NOK`.
2. Vérifie `cgpt-validation` connecté comme MCP local `stdio`.
3. Appelle `broker_readiness`.
4. Interprète strictement :
   - `READY` → continuer ;
   - `DEGRADED` → afficher `root_cause` et `recommended_action`, continuer seulement si le test actif reste sûr ;
   - `BLOCKED` → arrêter immédiatement en `NOK` ;
   - `HUMAN_REQUIRED` → arrêter et signaler l’intervention humaine requise.
5. Vérifie le contrôleur CGPT et le SSE direct OpenCode actifs.
6. Vérifie qu’aucune demande d’approbation parasite n’est en attente.
7. Initie une session OpenCode de test isolée.
8. Demande à OpenCode de produire une validation sur `cgpt-validation` avec un `requestId` unique.
9. CGPT rend une décision explicite unique `approved`.
10. Vérifie qu’OpenCode reçoit la réponse MCP corrélée.
11. Vérifie l’accusé de réception OpenCode via le SSE direct.
12. En cas de reconnexion ou divergence, confirme l’état réel par HTTP.

Affiche une coche verte uniquement pour une preuve réellement observée dans la session courante.

En cas d’échec, affiche :
- `NOK` ;
- le `requestId` concerné si disponible ;
- `root_cause` si disponible ;
- `recommended_action` si disponible ;
- la cause précise.

N’annonce jamais une réussite partielle comme un test validé.

À la fin du test, clôture uniquement la session et les ressources créées spécifiquement pour le test.

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
