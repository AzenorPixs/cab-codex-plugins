# Revue documentaire SCM 2.1.6

La proposition et son périmètre autonome sont validés par le développeur dans ce chat. Revue finalisée sur les sources intégrées avant archivage, sans installation ni activation.

| Document | Décision et contrôle attendu |
|---|---|
| AGENTS.md | Inchangé : règles d’agent, pas de changement de protocole humain. |
| PROJECT.md | Version courante et synthèse de la fermeture technique liée au serveur OpenCode. |
| TECHNICAL.md | PID/starttime, cadence 500 ms, annulation des communications, borne 4 s, statut 78, conservation des protections. |
| BUILD.md | Version 2.1.6, nouveau module dans les trois fermetures d’import, RestartPreventExitStatus=78, pas de nouvelle dépendance. |
| DEVOPS.md | Inchangé : inventaire généré, outils Node/Python/OpenSpec déjà suffisants ; aucune installation. |
| DEVELOPMENT_MAP.md | Amendement ciblé après libération de l’écriture par l’autre session, sans attribution de code ni reconstruction. |
| openspec/BATCH_CODES.md | SUP10 attribué par CAB-ACL-R5 : conserver cette attribution, l’état et le chemin courant, puis le chemin d’archive. |
| README.md | Expliquer serveur versus client, attente initiale, fermeture des trois services, reprise explicite et absence d’activation source. |
| CHANGELOG.md | Ajouter une entrée 2.1.6 après la frontière concurrente, conserver intégralement l’entrée de qualification 2.1.5. |
| OpenSpec | Valider le seul change de cycle de vie ; aligner les contrats de version courante sans réécrire de preuve historique. |
| ORCHESTRATED_CODING.md | Inchangé : session SCM directe, aucun pilotage ou protocole d’approbation nouveau. |

## Limites de qualification

Les preuves de la copie isolée ne constituent ni intégration aux sources partagées, ni installation, ni activation. La fermeture d’un client terminal ne suffit pas à établir la fin du serveur. Aucune panne de transport seule ne déclenche l’arrêt. Les états réels des RUN et le gel GLOBAL_RECONCILIATION ne sont pas consultés ni modifiés par le banc : il crée ses propres RUN et son propre gel synthétiques.

## Revalidation des échecs de nettoyage
Les deux tests négatifs ont démontré avant correction : diagnostic absent si callback de fermeture en échec, et sortie 0 du contrôleur si sa persistance statistique est impossible. Le correctif est d’abord vérifié dans la copie isolée pour ne pas changer les sources pendant un passage global. La tâche d’arrêt a été remise en attente puis validée après intégration et revalidation des 23 tests ciblés. Les journaux avant/après restent dans output/scm-2.1.6.

## Frontière concurrente finale
La qualification historique 2.1.5 a été archivée en premier dans `2026-10-28-qualify-historical-bootstrap-2-1-5`. Sa suite complète 494 Node / 73 Python et ses snapshots restent ceux de 2.1.5. Les empreintes de son archive sont conservées dans `output/scm-2.1.6/concurrent-archive-protected.json`. Ses deux corrections source sont préservées, avec le seul alignement de cible dans les attentes de maintenance et la constante du module de preuve. Aucune autre écriture de cette session concurrente ne reste annoncée.

## Attribution SUP10
Le développeur a fait attribuer SUP10 au change actif par l’autre session (CAB-ACL-R5). Cette annotation du titre et des deux suivis est conservée. La validation globale demeure en attente jusqu’au passage final ; ni le code ni le ratio de tâches ne constituent une preuve de réussite anticipée.

## Précondition de migration dans la fixture
Le passage global avec sceau corrigé a obtenu 512/513 : le scénario nominal de migration appelait nativeCohort avant stabilisation de la première connexion SSE après restart. Le refus native-observation-changed reste correct. La fixture attend désormais explicitement opencodeSse=connected avant ce seul appel nominal, sans réessayer le POST ni accepter un refus comme succès. Les scénarios négatifs de dérive native restent conservés. Ce diagnostic est corroboré par le contrôle en lecture seule de l’autre session.

## Diagnostic PLLM conservé
Un passage complet ultérieur a obtenu 512/513 avec mode absent dans une réponse PLLM, sans statut/body conservé par l’ancienne assertion. Le cas n’est pas reproduit dans vingt fixtures fraîches ni dans le fichier complet revalidé (92/92). La fixture exige maintenant le statut 200 et conserve le body synthétique dans son diagnostic d’échec. Son démarrage vérifie aussi PID et workspace avant toute requête mutante, pour exclure un contrôleur étranger. Une collision de port reste une hypothèse et n’est pas présentée comme cause acquise. Aucune règle de modèle ni garde runtime n’est modifiée. Le passage global final reste obligatoire.

## Préconditions des fixtures historiques
Un passage complet a ensuite échoué avant la transition visée, au démarrage du moniteur original 1.7.1 (timeout 10 s). Les trois freePort libéraient chacun leur port avant toute attribution suivante : l’unicité n’était pas garantie. Les fixtures conservent désormais simultanément les réservations jusqu’au lancement du composant concerné, vérifient leur unicité et l’identité publique du service, et conservent composant/statut/état du child dans le diagnostic de démarrage. Les délais et refus runtime restent inchangés. Le serveur V2 synthétique commun annonce aussi son PID réel plutôt que le thread hôte arbitraire 42, afin que la nouvelle surveillance de durée de vie suive sa véritable instance. Le timeout historique n’est pas attribué à cette dernière correction, puisque le moniteur 1.7.1 ne la chargeait pas.

## Verdict documentaire avant archive
AGENTS.md, DEVOPS.md et ORCHESTRATED_CODING.md sont inchangés : leurs règles et l’inventaire restent applicables à la session directe et à ses outils. PROJECT.md, TECHNICAL.md, BUILD.md et README.md sont alignés sur la base source 2.1.6 et expliquent la fermeture technique ; CHANGELOG.md conserve les entrées historiques et décrit les deux corrections. Les commandes et références distribuées incluent le module du moniteur et le statut 78. Les deltas OpenSpec sont validés, les 513 tests Node / 74 Python et les deux navigateurs passent. Les deux suivis conservent SUP10, MAI11 et les attributions antérieures ; leur état et leurs liens seront actualisés après l’archive. Aucune incohérence bloquante du périmètre n’est constatée ; les diagnostics et limites antérieurs restent explicitement conservés.

## Contrôle après archive
L’archivage natif est réussi avec synchronisation des sept capacités. La finalité du nouveau canon a été explicitée en français après génération, sans modifier les exigences. Les deux suivis sont amendés pour SUP10 archivé et ses liens réels ; MAI11 et les autres attributions sont conservés. Les statistiques couvrent cette seule réalisation SCM et ses mesures observées. Les contrôles après archive et ceux du rapport sont consignés dans output/scm-2.1.6 ; le rapport n’atteste aucune installation ni activation.
