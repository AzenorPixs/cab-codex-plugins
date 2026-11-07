# Qualification source CAB 2.4.0

Code non attribué. Mandat SCM avec CI/CD, huit catégories et compléments directs validés par le développeur. La qualification source ne prouve ni publication ni activation.

## Périmètre vérifié

- Autonomie et validation : lecture/exploration, atelier propre isolé, préparation locale des validations et révisions effectives exactes ; projet RO, atelier RW, réseau isolé, pairs masqués. Les résultats d’essai requièrent toujours la validation du pilote.
- SGS permanent : IPC privé, propriétaire noyau, déduplication, compteurs et périodes de modèles, couverture des lacunes, import de rapports, annexe native durable et reprise autonome de l’outbox. Les événements LLM ne doublent pas les compteurs natifs ; les sémantiques entrée/cache ne sont pas normalisées sans preuve.
- CCAB : FIFO par horodatage, lots justifiés, baux/résolutions individuelles, plugin/skill/commande et déclaration propriétaire via broker. Les incidents non acquittés ou encore utiles survivent au nettoyage.
- Nettoyage : même reçu scellé, chaque UID exécute ses écritures, aucune clé étrangère partagée, pairs et journal préservés, RUN actif refusé. Un essai isolé encore actif est arrêté avant purge de son état.
- Direct : identité Codex réelle, absence d’OpenCode fictif, fenêtre statistique figée avant rapport, nettoyage idempotent du seul atelier avec conservation des pairs et du rapport.
- Web : vues SGS/CCAB/archives réelles, lecture du contenu et suppression d’une copie CAB sans supprimer le document source. Chromium et Firefox ont exécuté le parcours ciblé.
- CABU : paquets et imports, unités associées, reprise de migration classique/privée et adoption sous empreinte, même transaction et once préservés. SGS/CCAB et moniteurs directs déjà actifs sont vérifiés par versions chargées/PID ; les services conformes ne sont pas redémarrés.

## Résultats vitaux

| Vérification | Résultat | Preuve locale |
|---|---|---|
| Nouvelles fonctions Node, deux UID réels compris | 23/23, aucun skip | output/scm-cab-240/vital-240.tap |
| Paquet broker, mise à jour et migration | 28/28 | output/scm-cab-240/update-migration-240.tap |
| Effacement intégré, clôture et coupures | 14/14 | output/scm-cab-240/cleanup-integration-240.tap |
| SGS/CCAB Python | 8/8 | tests/test_runtime_services.py, exécution réussie |
| Outbox broker Python | 1/1 | tests/test_broker_reporting.py, exécution réussie |
| Web Monitor unité240 | Chromium et Firefox réussis | output/scm-cab-240/browser-240-final.log |
| Syntaxe | 84 fichiers vérifiés, dont17 Python compilés | output/scm-cab-240/syntax-final.json |
| OpenSpec strict | réussi | commande validate du change |

Soit76 cas/unités du bilan final. Les tests intermédiaires ont notamment révélé le nom d’unité systemd avec @ refusé par l’ancien garde de nom ; le garde conserve sa liste fermée et accepte le nom du modèle distribué. Aucun test de qualification ne modifie les magasins métier actifs. Pas de campagne générale relancée.

## Collectes natives réelles

La source Codex de cette session SCM est lue quantitativement par le moteur2.4.0 ; son relevé final et ses modèles sont conservés dans STATISTICS.md. La qualification OpenCode a lu les messages natifs de PA01 en lecture seule, sans décision/rejeu, avec PID10912 préservé : output/scm-cab-240/opencode-live-collector-proof.json. Les compteurs de cette autre session ne sont pas attribués au change CAB. Le rescan Codex de139Mo depuis curseur vide a pris0,644s en9lots : mesure locale, sans appel LLM supplémentaire, pas une garantie de latence universelle.

## Limites et activation distincte

Les temps de préparation, premier token et coût monétaire restent N/A si la source ne les expose pas. Les écritures via shell ne sont pas estimées depuis les seuls FileChange. Bubblewrap est une capacité existante qualifiée ; aucune installation de dépendance ni exécution hôte non isolée n’est inférée.

C12 reste SEALED avant activation ; les4sessions OC ont déjà été supprimées, mais aucune purge CAB n’est revendiquée ici. Reprendre uniquement erasure-8bf1e6c3-15cc-48ae-8c2a-a501f4bec290 après CABU2.4.0 vérifié. PA01 conserve ses ressources et ses effets existants. La publication DIU, l’activation CABU et les notifications sont prouvées par des reçus opérationnels séparés ; aucun succès runtime n’est déduit des présentes sources.

Le rapport individuel SGS a été créé et vérifié : six sections, UTF-8/LF, annexe native de2898événements avec une période de modèle, fenêtre figée. DELTA a refusé le global pour contrat incompatible ; le couple global a été conservé, sans REBUILD automatique. Les23spécifications canoniques passent la validation stricte après synchronisation.
