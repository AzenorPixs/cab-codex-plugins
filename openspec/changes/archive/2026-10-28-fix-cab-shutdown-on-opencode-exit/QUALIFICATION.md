# Qualification SUP10 — CAB 2.1.6

Session directe SCM, périmètre initial et extension ciblée du sceau validés par le développeur. Aucun pilotage de RUN réel, aucune installation ni activation.

## Résultats finaux

- Node : 513/513, zéro échec et zéro saut ; jeu historique 1.7.1 fourni et test OpenCode V2 natif activé.
- Python : 74/74, zéro échec.
- Navigateurs : Chromium 156.0.8078.47 et Firefox 153.5.1, en-tête et affichage mobile validés.
- Syntaxe Node/Python, UTF-8/LF, identité des copies broker et empreintes du code testées ; archive concurrente MAI11 conservée.
- OpenSpec standard/strict avant archive : les deux contrôles réussissent ; la synchronisation et les contrôles après archive sont enregistrés séparément.

## Critères établis

Les fins normale et brutale du serveur synthétique ferment les trois services, libèrent le gardien du registre et conservent deux jobs armés ainsi qu’un gel DRAINING identiques sur disque. La borne de cinq secondes est vérifiée dans les tests. Une panne HTTP/SSE ne ferme pas les services ; une panne du contrôleur laisse ses pairs disponibles. Attente initiale, PID réutilisé, identité illisible, arrêt simultané et échec de nettoyage sont couverts. Le contrôleur attend aussi son App Server enfant. La persistance statistique impossible produit 78 et libère le helper.

Le broker sur EOF MCP termine avec une demande en attente, conserve PENDING et libère son verrou, même si stdout est fermé. Aucun correctif de comportement broker n’était nécessaire : seules ses versions et copies distribuées sont alignées.

Le sceau utilise un instant unique : la reproduction de frontière d’horloge donne exactement 60000 ms, et la reprise passe sans modifier les gardes. Les scénarios de maintenance, interruptions, retours arrière et refus historiques restent exécutés.

## Échecs et revalidations conservés

Les six passages globaux et leurs comptes sont dans PREUVES-SCM.json, sans addition de leurs tests recouvrants. Les premiers échecs ont révélé un module absent de l’arborescence documentaire du moniteur, la double capture de temps du sceau, une migration nominale lancée avant connexion SSE, un écart PLLM non reproduit, puis un timeout du moniteur historique avant la transition. Les fixtures ont été corrigées sans accepter de refus comme succès : précondition SSE, statut/body de réponse, identité des services, ports réservés et PID du serveur synthétique réel. L’hypothèse d’une collision de port n’est pas présentée comme cause prouvée de l’écart PLLM. Le dernier passage complet couvre le jeu courant entier et réussit.

## Limites et preuves

Les journaux détaillés restent sous `output/scm-2.1.6/`, notamment `node-global-qualified.log`, `python-global.log`, `browser-header.log`, les diagnostics du sceau et les snapshots d’empreintes. Les mesures métier et quotas non collectés restent N/A. Les essais et l’archive source ne prouvent ni installation ni activation réelle. La remise en service et la reprise métier restent explicites.

Voir [les preuves structurées](PREUVES-SCM.json) et [la revue documentaire](COHERENCE.md).

## Validation après synchronisation
OpenSpec global standard : 16/16 ; global strict : 16/16 ; archives strict : 76/76. Les 522 liens locaux des suivis et des documents de cette archive sont présents. STATISTICS.md contient six sections ; tâches 7/7, aucun bilan BLOCKER.md/BLOCKERS.md obsolète. La finalité du nouveau canon a été renseignée après génération native. Les empreintes du code qualifié et de l’archive MAI11 sont inchangées.
