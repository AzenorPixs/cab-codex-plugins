---
description: Piloter hors sandbox la communication de validation OpenCode–Codex
version: 0.84.2
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
- `/cab update`

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
- ne remplace jamais une décision corrélée déjà enregistrée, y compris par
  une décision automatique postérieure ;
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
5. Résous les ressources du plugin CAB installé, puis copie son contrôleur et son modèle d’unité dans les répertoires stables du profil : `~/.local/share/cab-approval-bridge/` et `~/.config/systemd/user/`. Crée ou actualise `~/.config/cab-approval-bridge/controller.env` avec le workspace absolu du job et `OC_Codex_OUTSIDE_SANDBOX=1`, sans y écrire de secret. Exécute `systemctl --user daemon-reload`. Cette installation différée ne doit jamais appeler `systemctl --user enable` et ne doit pas démarrer le service avant cette commande `/cab start` explicite.
6. Démarre ou réutilise le contrôleur Codex persistant hors sandbox par `systemctl --user start cgpt-approval-bridge-controller.service`, avec `OC_Codex_OUTSIDE_SANDBOX=1` ; l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1` reste accepté. Vérifie qu’il est `active` et que son unité utilise `Restart=on-failure`.
7. Vérifie le contrôleur Codex sur son interface locale.
8. Établit et maintient le SSE HTTP direct OpenCode `/global/event`.
9. Crée ou réutilise une unique session de codage OpenCode persistante avec l’API native `POST /session`. Conserve et affiche son identifiant ; elle est l’unique canal des mandats de codage jusqu’à la clôture du job.
10. Adresse les mandats exclusivement à cette session via `POST /session/<id>/message`. Aucun appel CLI éphémère ne peut transmettre ou exécuter un mandat de codage. La session doit rester visible au développeur dans OpenCode.
11. Dans cette session, appelle `broker_readiness` sans lecture, commande ni écriture du projet.
12. Accepte comme états possibles : `READY`, `DEGRADED`, `BLOCKED`, `HUMAN_REQUIRED`.
13. Après reconnexion SSE ou divergence détectée, réconcilie l’état réel via HTTP auprès d’OpenCode, puis recontrôle `/mcp` avant tout nouveau mandat.
14. Crée ou réactive le heartbeat global « Surveillance CAB » toutes les 30 secondes.
15. Le heartbeat surveille OpenCode, `/mcp`, `broker_readiness`, le contrôleur et le SSE OpenCode.
16. Le heartbeat reste silencieux lorsque tout est sain et ne prend aucune décision de validation.
17. Publie `CAB_ACTIF` uniquement si les preuves suivantes sont présentes :
    - OpenCode sain ;
    - MCP `cgpt-validation` connecté ;
    - `broker_readiness` exploitable ;
    - contrôleur Codex joignable ;
    - SSE OpenCode `connected` ;
    - heartbeat actif.
18. Toute preuve absente impose `CAB_INACTIF`.
19. Avant le premier pilotage réel après démarrage, exécute obligatoirement `/cab test`.

Une simple réponse HTTP, un ancien état MCP ou une ancienne session de test ne suffit jamais à déclarer `CAB_ACTIF`.

## `/cab run`

Exécute un job piloté dans la session persistante après un `/cab start` et un
`/cab test` réussis.

1. Constitue un contrat de job : objectif, session OpenCode, répertoire cible,
   limites fonctionnelles et critères de fin. Ce contrat ne vaut jamais une
   décision d’approbation d’action.
2. Avant chaque édition, commande Bash, commande système ou commande OpenSpec
   qui exige une permission native, l’agent de codage crée un mandat CAB
   unitaire : `requestId`, `approval_id`, `change_id`, session, répertoire,
   résumé et exactement un fichier relatif ou une commande complète.
3. Codex examine chaque mandat dans la session persistante et rend une décision
   explicite, unique et corrélée. Après une décision `approved`, CAB répond
   `once` à la seule permission native OpenCode correspondante, puis consomme
   ce mandat.
4. Une seconde permission, une autre commande, un autre fichier ou une demande
   sans décision corrélée reste en attente. CAB ne l’acquitte jamais seul et
   l’écart est remonté à l’orchestrateur.
5. Après chaque tour de l’agent de codage, contrôle la session persistante. Si
   le contrat n’est pas terminal, envoie le mandat suivant sans créer de session
   éphémère et sans conclure la réponse Codex.
6. Le job devient terminal uniquement si tous ses critères sont satisfaits, si
   CAB retourne `BLOCKED` ou `HUMAN_REQUIRED`, ou si le développeur l’arrête
   explicitement. À ce moment seulement, publie le bilan final puis clôture le
   contrat côté CAB.

## `/cab test`

Exécute un test non destructif après `/cab start`.

Utilise la session de codage persistante créée par `/cab start`. Ne crée pas de session éphémère : le test et les mandats ultérieurs doivent rester observables au même endroit. Le test ne lit ni n’écrit le projet et n’exécute aucune commande qui y accède. Pour vérifier le cycle CAB de bout en bout, il utilise exclusivement la commande inoffensive `true`, sans effet fonctionnel.

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
8. Dans la même session persistante, demande à OpenCode de produire une validation non destructive sur `cgpt-validation` avec un `requestId` unique, `files: []` et `commands: ["true"]`.
9. Codex rend une décision explicite unique `approved`.
10. Vérifie dans cette session qu’OpenCode reçoit la réponse MCP corrélée et exécute `true` une seule fois.
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

## `/cab update`

Met à jour séparément le plugin CAB et la copie de la commande `/cab` installée
dans le profil Codex. Cette sous-commande ne démarre ni n'arrête OpenCode, le
broker MCP, le contrôleur, le SSE ou une session de codage.

1. Vérifie avec `codex plugin marketplace list` que la marketplace
   `cab_codex_plugins` est configurée depuis
   `AzenorPixs/cab-codex-plugins`, branche `main`, avec le chemin sparse
   `.agents/plugins` et `plugins`.
2. Si une marketplace locale porte déjà ce nom, mémorise sa racine, la retire,
   puis ajoute la source Git par
   `codex plugin marketplace add AzenorPixs/cab-codex-plugins --ref main --sparse .agents/plugins --sparse plugins`.
   Si cet ajout échoue, restaure immédiatement la source locale mémorisée et
   affiche `CAB_MARKETPLACE_MIGRATION_ÉCHOUÉE`. N'essaie aucune actualisation
   de plugin après cet échec.
3. Si la marketplace Git n'est pas encore configurée, l'ajoute avec la même
   commande. Un échec affiche `CAB_MARKETPLACE_INDISPONIBLE` et préserve les
   autres ressources CAB.
4. Actualise l'instantané Git par
   `codex plugin marketplace upgrade cab_codex_plugins`, puis vérifie que
   `cab-approval-bridge@cab_codex_plugins` est disponible.
5. Télécharge et valide le manifeste distant
   `plugins/cab-approval-bridge/.codex-plugin/plugin.json` depuis la même
   branche GitHub. Compare sa version SemVer de base, sans son cachebuster
   `+codex`, à celle renvoyée par `codex plugin list --marketplace cab_codex_plugins --available --json`.
6. Si la version distante est égale ou antérieure à celle installée, affiche
   `CAB_PLUGIN_DÉJÀ_À_JOUR` et ne réinstalle pas le plugin.
7. Si la version distante est strictement plus récente, exécute une seule fois
   `codex plugin add cab-approval-bridge@cab_codex_plugins`, puis relit les
   métadonnées installées. Affiche `CAB_PLUGIN_MIS_À_JOUR` uniquement si la
   version installée est celle du manifeste distant ; sinon, affiche
   `CAB_PLUGIN_MISE_À_JOUR_ÉCHOUÉE` avec la cause observée.
8. Utilise exclusivement la référence GitHub suivante pour la commande CAB :
   `https://github.com/AzenorPixs/cab-codex-plugins`, branche `main`, chemin
   `.codex/commands/cab.md`. Construit l'URL brute HTTPS correspondante sans
   accepter de redirection vers un autre hôte.
9. Télécharge cette commande dans un fichier temporaire du profil Codex avec
   `curl --fail --silent --show-error`, sans écrire la cible locale. Vérifie
   que le frontmatter YAML contient une version SemVer valide.
10. Lit la version de la commande locale
    `${CODEX_HOME:-$HOME/.codex}/commands/cab.md`. Une copie locale sans
    version est traitée comme une installation héritée, donc antérieure à une
    commande distante valide.
11. Si la version GitHub est égale ou antérieure à la version locale, affiche
    `CAB_COMMANDE_DÉJÀ_À_JOUR` et conserve le fichier local.
12. Si la version GitHub est strictement plus récente, remplace atomiquement
    la copie du profil par le fichier temporaire validé, puis relit sa version
    et affiche `CAB_COMMANDE_MISE_À_JOUR` seulement en cas de concordance.
    Tout échec laisse la copie locale inchangée et affiche
    `CAB_COMMANDE_MISE_À_JOUR_ÉCHOUÉE` avec la cause observée.
13. Affiche toujours `CAB_RÉSUMÉ_VERSIONS`, y compris après un échec, avec :
    - GitHub : version du manifeste du plugin, version du contrôleur extraite
      de `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`,
      version du broker extraite de `src/cgpt_approval_bridge_server.py` et
      version du frontmatter de `.codex/commands/cab.md` ;
    - profil local : version du manifeste et du contrôleur depuis le cache du
      plugin installé, version du broker réellement actif fournie par
      `broker_readiness.server_version`, et version du frontmatter de
      `${CODEX_HOME:-$HOME/.codex}/commands/cab.md`.
    Toute source inaccessible ou version absente doit être affichée comme
    `INDISPONIBLE`, sans remplacer cette valeur par une déduction.

N'édite jamais le manifeste du plugin, la configuration Codex ou les fichiers
du projet piloté. La seule écriture locale admise est le remplacement atomique
de la copie `/cab` dans le profil Codex. La migration contrôlée de la source
locale CAB vers son marketplace Git est l'unique modification de marketplace
autorisée ; elle doit toujours être réversible en cas d'échec.

## `/cab stop`

1. Supprime tous les heartbeats et cron healthchecks créés par `/cab`, dont « Surveillance CAB ».
2. Ferme les flux SSE ouverts par `/cab`.
3. Arrête explicitement et proprement uniquement le contrôleur démarré par `/cab` avec `systemctl --user stop cgpt-approval-bridge-controller.service`. Ne désactive ni ne supprime son unité : elle reste installée mais inactive jusqu’au prochain `/cab start`.
4. Ne tente pas d’arrêter directement `cgpt-validation` : son cycle de vie appartient à OpenCode.
5. Ne ferme jamais OpenCode sauf instruction explicite du contexte initial ou du développeur.
6. Affiche le bilan : éléments arrêtés, éléments préservés et éventuelles erreurs.
