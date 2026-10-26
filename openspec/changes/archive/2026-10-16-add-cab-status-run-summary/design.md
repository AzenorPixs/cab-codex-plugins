## Context
/cab est une commande Codex déclarative. Le contrôleur expose déjà GET /runs, GET /status et les vues ciblées /status et /integration-status par RUN. Les checkpoints peuvent conserver une ancienne attente après reprise. Un orchestrateur actif peut travailler quand son codeur est idle ; RESERVED ou IMPLÉMENTATION ne prouvent pas une activité courante.

## Goals / Non-Goals
Tableau français horodaté : RUN / Nom du change, Actions réalisées, Actions en cours, Actions restant à réaliser. Statut, pair et cause dans la première colonne. Lectures ciblées autorisées ; fin de réponse hors boucle de pilotage. Aucun nouvel endpoint, schéma runtime, dépendance, sondage récurrent, message, permission ou écriture du projet suivi. La version source reste distincte du déploiement.

## Decisions
1. Implémentation dans le prompt distribué : routage précoce status, outils natifs de lecture, APIs GET existantes et synthèse courte. Aucun nouveau moteur serveur ne valide le projet à la place de Codex.
2. Réconcilier identités et dates. Une observation actuelle corrélée prime sur une ancienne prochaine_action ; une attente achevée ne bloque plus le RUN. Une contradiction non résolue donne INDÉTERMINÉ.
3. Une attente de pair exige un obstacle actuel visant ce pair. Un orchestrateur actif sous exclusion reste en attente pour le travail suspendu. Les attentes internes conservent leur cause.
4. Recouper tâches cochées et preuves ; archive seule, processus vivant et READY ne prouvent pas la livraison complète. Ne jamais inventer un test ou pourcentage.
5. Aligner les briques, plugin, commande, attentes de tests et cadrages sur 1.2.1 ; cachebuster frais. Aucun état vivant migré.

## Risks / Trade-offs
La synthèse est exécutée par l'agent Codex. Les tests locaux prouvent le contrat de distribution et ses instructions ; ils ne constituent pas une qualification de chaque réponse LLM en production. Revoir activité/idle, attente/levée, attente interne, contradiction/indisponibilité et sous-job livré/parent incomplet. Sans source actuelle exploitable : INDÉTERMINÉ.

## Validation and Rollback
Tests de distribution et suites CAB affectées, syntaxe Python/Node, JSON, UTF-8/LF, strict OpenSpec ciblé/global, empreintes sans Git. Repli local possible sur les contenus préservés ; aucun déploiement. Après preuves : archive unique, strict postarchive et STATISTIQUES.md six sections, télémétrie pilotée N/A car session SCM directe.

## Revue finale avant archive

| Document | État et preuve de cohérence |
| --- | --- |
| Projet réel | Commande status distribuée ; 225 tests réussis, aucun ignoré ; smoke OpenCode dans une instance isolée, aucun runtime utilisateur modifié. |
| AGENTS.md | Inchangé, empreinte identique : règles de portée/sécurité et session directe toujours applicables. |
| PROJECT.md | Mis à jour, §1 version 1.2.1 et §5.5 consultation status. |
| TECHNICAL.md | Mis à jour, §3 version et §16 sources, statut et lecture seule. |
| BUILD.md | Mis à jour, §6 distribution du même fichier sans module ajouté, §7 version 1.2.1 et distribution concurrente alignée. |
| DEVOPS.md | Inchangé, empreinte identique : inventaire DIU du 16/10/2026 ; Node/Python/OpenSpec existants utilisés, aucune dépendance ajoutée. |
| README.md | Mis à jour, commande status et filtre dans la syntaxe publique, règles de collecte et version source 1.2.1. |
| CHANGELOG.md | Entrée 1.2.1 de préparation source, comportement et limites ; historique 1.2.0 préservé. |
| openspec/specs/ | Canon initial intact avant archive ; delta strict validé : 5 exigences modifiées, 7 ajoutées, 22 existantes préservées. Synchronisation attendue par archive uniquement. |

Revue des scénarios du contrat distribué : revue Codex active/codeur idle ;
exclusion d’un pair malgré lectures de Codex ; ancienne attente avec ended_at
et reprise récente ; attente interne ; source défaillante avec autre preuve
actuelle ; contradiction non résolue ; candidat sans change ; RUN exact inconnu ;
archive sans rapport ; sous-job livré/parent en sélection. Ces contrôles sont
une revue des instructions et spécifications, pas des réponses LLM simulées
présentées comme exécutions en production. Les 2 nouveaux tests de distribution
vérifient la séparation du routage et le contrat ; les 223 autres régressions
sont préservées. L’instance native isolée qualifie 1.2.1, pas le déploiement vivant.

Vérifications préarchive : 8 compilations Python, 11 contrôles Node --check,
JSON manifeste/marketplace, UTF-8/LF, 21 modifications de version seules prouvées
par inversion et empreintes ; aucun écart non prévu. Strict global : 10/10,
exit 0. Aucune inspection Git, aucun protocole piloté ou skill statistique lancé.
Le premier strict ciblé avait 3 avertissements de longueur (exit 1), corrigés
par exigences atomiques puis strict exit 0. Un contrôle automatique a refusé
une écriture groupée avant exécution ; les fichiers neufs ont ensuite été
créés séparément et l’empreinte du canon inchangé a été vérifiée.
