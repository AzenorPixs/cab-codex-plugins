# Qualification SCM — broker enfant d'un thread OpenCode

Validation humaine directe « Je valide » pour le correctif ciblé, qualification, archivage, poursuite de mise à jour et reprise CISMP. Base 1.10.1 conservée. Aucun Git inspecté, préparé ou publié.

## Preuves

- Le nouveau test avec un véritable Worker Node crée Python depuis un thread secondaire et vérifie son absence des enfants du thread principal. Il échoue avec update-broker-process-not-unique avant correctif, puis réussit après correction.
- Tests de maintenance et distribution : 46/46 réussis, zéro ignoré. Refus d'enfant absent/multiple, UID divergent, point d'entrée divergent et identité parent altérée vérifiés ; les anciens contrôles restent exercés.
- Syntaxe : trois fichiers Node et le helper Python contrôlés avec succès.
- Banc Docker network=none, deux UID réels 1000/1002 : succès puis réponse de déconnexion perdue, broker réellement créé depuis un thread secondaire. Pour chacun : 40 RUN, 256 ressources par RUN, HTTP 5 218 572 octets, privé 5 657 012 octets ; quatre versions 1.10.1, même OpenCode et PAUSE conservés, refus noyau d'écrire dans le broker, sources inchangées et aucun compte/droit hôte modifié.
- Lecture locale sans effet : le module corrigé reconnaît le broker UID1002 enfant du même OpenCode PID2273098/startTime48204786. Cette lecture ne libère pas le gel et ne remplace pas la vérification complète par l'updater.

## Revue documentaire

| Document | État et preuve |
|---|---|
| AGENTS.md | Inchangé : autorisations, secrets, tests et archivage conservés. |
| PROJECT.md | Mis à jour : filiation du broker depuis les threads du même OpenCode. |
| TECHNICAL.md | Mis à jour : déduplication, contrôles conservés et recontrôle parent. |
| BUILD.md | Mis à jour : qualification et distribution du module de preuve. |
| DEVOPS.md | Inchangé : Node/Python et Docker dédiés existants, aucune dépendance. |
| README.md | Mis à jour : comportement et refus de preuve. |
| CHANGELOG.md | Entrée 1.10.1 complétée. |
| ORCHESTRATED_CODING.md | Inchangé : aucune permission, cycle de RUN ou mandat modifié. |
| OpenSpec | Une exigence ajoutée à active-component-update ; validation stricte avant archive. |

La référence component-update.md décrit les lectures de /proc et les limites. Le module ne lit aucun environnement et ne restitue aucun argv brut. ENOENT/ESRCH sur un thread disparu sont tolérés ; les autres erreurs restent bloquantes. Aucun paramètre runtime nouveau.

## Livrables et limites

PREUVES-SCM.json contient les empreintes de 11 fichiers contrôlés. Les journaux détaillés sont dans output/scm/fix-broker-worker-child-proof : node-tests.log, two-uid-worker.json et live-readonly-proof.json. La suite Node complète 371/0 et la restauration historique ont été qualifiées dans l'archive précédente ; elles ne sont pas recomptées dans ces 46 tests ciblés. Aucune nouvelle qualification fournisseur, aucun test produit Pixs ou LXC physique n'est revendiqué.

L'activation locale reste distincte : terminer la même transaction avec les stages initiaux, puis, si nécessaire, installer le module corrigé par une nouvelle maintenance ordinaire, sans modifier manuellement de stage/reçu ou ancienne release. Les CISMP ne reprennent qu'après contrôle des composants et libération.
