# STATISTIQUES — SCM CAB 1.10.7

## 1. Cadre, autorisation et identité
Projet : Codex Approval Bridge (`cab`), racine `/home/devops/datas/cab`. Session directe SCM, objectif validé : deux correctifs, OpenSpec, incrément 1.10.7, tests, migration des briques et reprise CISMP. Rapport produit le 2026-10-27T14:38:15.147971+00:00. Modèle déclaré par la session : gpt-6.1-sol. La compétence de statistiques SCMP n'a pas été invoquée. Les sondes périodiques, quotas et comptes de messages sont N/A : non collectés pour cette session directe.

## 2. Réalisations et périmètre
10 tâches validées, 0 non cochée dans l'archive. Deux correctifs : propriétaires explicites des modules/répertoire/processus ; reconstruction atomique d'une demande du job courant sous PAUSE pour rejected seulement. Les anciennes preuves et le prévol historique restent compatibles. Les cinq modules de maintenance/contrôle concernés, leurs tests, les supports de distribution et cadrages courants ont été actualisés ; les copies broker et toutes les briques partagent 1.10.7. Aucun droit, utilisateur ou secret hôte modifié. Le nombre Git de fichiers modifiés est N/A à la production du rapport : inspection Git réservée à l'étape conditionnelle suivante, sans estimation.

## 3. Tests et validations observés
| Contrôle | Résultat | Total et limites |
| --- | --- | --- |
| Suite Node | Réussie | 431 cas : 405 réussis + 26 ignorés = 431 ; 0 échec |
| Suite Python | Réussie | 73 tests, 0 échec |
| Syntaxe Python | Réussie | 16 fichiers compilés dans un cache de test |
| Banc deux UID, artefacts acteur | Réussi | Succès + réponse de déconnexion perdue, grand registre et enfant créé par thread secondaire |
| Banc deux UID, preuve historique | Réussi | Succès + réponse perdue, source broker réellement non écrivable par l'acteur |
| OpenSpec strict avant archive | Réussi | 15 éléments, 0 échec |
| OpenSpec strict après archive | Réussi | 14 spécifications, 0 échec |
| UTF-8/LF | Réussi | 67 fichiers contrôlés avant installation, puis rapport et archive relus |

Les 26 cas Node ignorés correspondent à 25 tests du profil historique gelé nécessitant son paquet original explicitement fourni, et à un test OpenCode natif soumis à son option d'environnement. Ils ne sont pas présentés comme exécutés. La maintenance ordinaire présente est qualifiée par quatre scénarios à deux UID réels et par l'opération vivante. Les premiers essais ont révélé un contexte de RUN figé, deux attentes de version devenues anciennes et une inspection de banc faite sous root ; les corrections ont été vérifiées par les nouveaux essais. Les logs et JSON sont dans `output/scm/fix-maintenance-ownership-and-paused-orphan-rejection` (hors Git).

## 4. Migration et reprise vérifiées
Transaction `update-ddfd02bf-fb67-4906-8760-2ae22d421955` : COMPLETED. Versions réellement actives : contrôleur, superviseur, Web et broker **1.10.7**. Readiness READY, pending=0, stalled=0 et maintenance RELEASED à la vérification. Deuxième invocation avec la même preuve : up-to-date sans nouvel arrêt. OpenCode conservé, nouveau broker corrélé, modules et métadonnées broker inchangés. Services sous UID 1000 ; OpenCode/broker sous UID 1002 ; modules sous UID 1000 et répertoire sous UID 1002, explicitement prouvés.

L'ancien mandat non exécuté a été refusé administrativement puis confirmé REJECTED par get_approval du même approval_id avant fermeture du currentCabMandate. Une tentative de tool indisponible et un appel -32602 sans paramètres n'ont produit aucun effet ; le rejet exact est le seul effet administratif terminal. Le seul RUN encore réservé a reçu RESUME après vérification. Son orchestrateur 1CISMP7 est actif et reprend la lecture du prompt et des spécifications ; les RUN livrés/abandonnés n'ont pas été réveillés. Aucune nouvelle écriture métier n'est prétendue par ce rapport.

## 5. Durées et mesures disponibles
Suite Node : 22.705 s. Suite Python : 4.422 s. Durée globale SCM, temps d'attente, consommation de jetons, comptes de messages/outils et durée des bancs : N/A, aucune télémétrie exhaustive fiable n'ayant été collectée. Les quatre scénarios à deux UID sont distincts des 431 cas Node et des 73 tests Python ; ils ne sont pas additionnés à ces totaux.

## 6. Clôture, traçabilité et limites
Archive : `openspec/changes/archive/2026-10-27-fix-maintenance-ownership-and-paused-orphan-rejection` ; canons active-component-update et controller-transport synchronisés avant archivage avec `--skip-specs`, puis strict global réussi. La matrice documentaire détaillée est dans VALIDATION.md. Aucun BLOCKER.md/BLOCKERS.md dans cette archive. Les étapes conditionnelles commit local, Forgejo, GitHub et GitLab suivent ce rapport selon SCM ; leurs SHA et résultats seront restitués après exécution, sans anticiper un push. Le paquet local installé 1.10.7 est distinct de GitHub 1.10.6 tant qu'une publication n'est pas vérifiée ; provenance, ancienne source Git et sauvegardes sont conservées. Après premier reçu générique recoveryId=null, les anciens lecteurs incompatibles exigent une réconciliation de retour explicite, sans restauration d'un registre effaçant les décisions.
