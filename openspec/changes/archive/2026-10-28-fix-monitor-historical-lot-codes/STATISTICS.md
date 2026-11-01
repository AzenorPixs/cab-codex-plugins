# Statistiques — fix-monitor-historical-lot-codes

Projet : Codex Approval Bridge. Date : 28 octobre 2026, Europe/Paris.
Archive : `2026-10-28-fix-monitor-historical-lot-codes`.
Périmètre : correctif source L1/L2 puis archivage explicitement demandé.
L’inventaire et les attributions du précédent job ACL sont exclus de ces statistiques.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| N/A — agent Codex identifié | N/A | OpenAI | N/A | N/A | N/A | N/A |

Le modèle exact, sa version, le raisonnement et les durées actives ne sont pas
exposés par une télémétrie de ce change. Sondes périodiques non activées :
aucune moyenne ni reconstitution rétroactive. Dénominateur du temps de service :
N/A, durée active cumulée absente.

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent orchestrateur — session directe | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

Le développeur a demandé le correctif, OpenSpec et les tests ciblés, puis
autorisé séparément l’archivage, ce rapport et les documents de suivi,
sans déploiement ni activation. Aucun RUN CAB de pilotage ni agent délégué
n’est créé pour cette session directe.

Résultat : L1 et L2 sont reconnus à l’identique en complément des formats
existants. Les autres codes à un chiffre restent refusés. Les règles du
premier titre, des séparateurs, des blocs de code et des lectures sûres sont
conservées. Aucun code renuméroté ; ce change reste sans code attribué.

| Indicateur vérifiable | Nombre | Part du périmètre correspondant |
|---|---:|---:|
| Tâches terminées de ce change | 4/4 | 100 % |
| Tests de la suite ciblée finale réussis | 14/14 | 100 % |
| Échecs finaux de cette suite | 0/14 | 0 % |
| Cas ignorés de cette suite | 0/14 | 0 % |
| Codes des archives antérieures reconnus et conservés | 72/72 | 100 % |
| Archivage demandé et réussi | 1/1 | 100 % |

Avant correction : deux tests de reproduction échouent sur null au lieu de
L1, soit 2/2 (100 %). Ces échecs attendus démontrent le défaut ; ils ne sont
ni des refus de permission ni des échecs finaux. Ils appartiennent à la suite
ensuite corrigée et ne sont pas additionnés aux 14 cas uniques finaux.
La répétition réussie de la suite avant archive ne produit pas 14 nouveaux cas.

Durée exhaustive, messages et appels exhaustifs, tokens, cache, coût et
compactions : **N/A — collecte exhaustive non activée pour ce change**.
La durée d’un outil n’est pas assimilée au temps de génération du modèle.

## 2. Types de messages et d’outils

Sources : demandes humaines et historique visible du correctif, résultats des
commandes, [tasks.md](tasks.md), delta archivé et canon. Outils employés :
lectures ciblées, éditions, JavaScript local, comparaisons d’empreintes,
Node.js et OpenSpec. Une lecture native du quota partagé suit l’archivage.

| Catégorie | Observations | Effectif exhaustif et pourcentage |
|---|---|---|
| Messages humains | Mandat de correction puis mandat d’archivage | N/A — pas de comptage instrumenté |
| Réponses Codex | Analyse, réalisation, tests et restitution | N/A — pas de comptage instrumenté |
| Outils locaux | Lectures, éditions, commandes et contrôles | N/A — pas de compteur de toutes les tentatives |
| Refus de permission | Aucun refus explicite observé pour ce change | N/A pour un taux exhaustif |
| Erreurs techniques | Tests initiaux échoués attendus ; échec technique de préparation du rapport, corrigé | N/A pour un taux de tous les outils |

Convention : « approuvé et exécuté » désigne une opération autorisée terminée
avec succès ; cela ne prouve pas une approbation manuelle unitaire. « Refusé »
exige un refus de permission enregistré. Un échec technique n’est pas un refus.
Les effectifs et proportions non instrumentés restent N/A.

Une première préparation du rapport en mémoire a échoué sur une erreur de
syntaxe JavaScript avant toute écriture ; le rapport a ensuite été créé par
édition directe. Cette erreur n’est pas présentée comme un refus de permission
ou un échec fonctionnel du correctif.

## 3. Fichiers modifiés

Réalisation source : six fichiers existants modifiés (60 %) et quatre
artefacts du change créés (40 %), soit dix chemins (100 %). À la clôture,
OpenSpec déplace ces quatre artefacts ; le présent rapport est ajouté.
Les éditions successives du registre et de la carte ne sont pas comptées
comme de nouveaux fichiers. Le périmètre final comporte onze chemins logiques.

| Chemin final absolu | Rôle |
|---|---|
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs | Parseur : exception exacte L1/L2 |
| /home/devops/datas/cab/tests/web-monitor.test.mjs | Régressions et lecture actif/archive |
| /home/devops/datas/cab/CHANGELOG.md | Correctif source non publié |
| /home/devops/datas/cab/openspec/specs/local-web-monitor/spec.md | Exigence canonique actualisée avant archive |
| /home/devops/datas/cab/openspec/BATCH_CODES.md | Entrée provisoire déplacée vers l’archive |
| /home/devops/datas/cab/DEVELOPMENT_MAP.md | Statut, liens et totaux actualisés |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-fix-monitor-historical-lot-codes/.openspec.yaml | Métadonnées déplacées |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-fix-monitor-historical-lot-codes/proposal.md | Proposition déplacée et conservée |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-fix-monitor-historical-lot-codes/tasks.md | Tâches déplacées et note de clôture ajoutée |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-fix-monitor-historical-lot-codes/specs/local-web-monitor/spec.md | Delta déplacé et conservé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-fix-monitor-historical-lot-codes/STATISTICS.md | Rapport créé après archivage |

Tentatives d’écriture approuvées, refusées et en erreur, et proportions :
N/A, absence de compteur exhaustif ; les chemins ne sont pas des appels d’édition.
Le déplacement des quatre artefacts a conservé leurs octets ; la note de
clôture a ensuite été ajoutée aux tâches. Aucun rapport historique remplacé.
Les 72 archives préexistantes, leurs codes, titres et preuves sont préservés.

## 4. Commandes

Les libellés ci-dessous restent limités à 100 caractères. Effectifs exhaustifs
d’exécutions et parts par famille : N/A, aucun journal agrégé complet.
Aucune commande refusée par une permission dans les traces de ce change.

| Commande ou famille | Résultat et portée |
|---|---|
| node --test tests/web-monitor.test.mjs | 14/14 réussis (100 %), 0 échec, 0 ignoré |
| node --check <module ou test> | 2/2 fichiers valides (100 %) pendant la réalisation |
| openspec validate fix-monitor-historical-lot-codes --strict --type change | Change valide avant archivage |
| openspec archive fix-monitor-historical-lot-codes --yes --json | Une archive réussie ; canon inchangé |
| openspec validate --all --json --report findings | Après archive : 15/15 (100 %), 0 problème |
| openspec validate --all --strict --json --report findings | Après archive : 15/15 (100 %), 0 problème |
| openspec validate --archived --strict --json --report findings | Après archive : 73/73 (100 %), 0 problème |
| Contrôles locaux d’empreintes, UTF-8/LF et liens | Périmètre et préservation contrôlés avant clôture |

Le canon était déjà identique au delta : l’archivage annonce specsUpdated=false,
avec zéro exigence ajoutée, modifiée, supprimée ou renommée. Aucun skip-specs
ni contournement de validation utilisé.

Avant archive, le contrôle global comptait 16 éléments : 15 canons et un
change actif. Après archive, --all couvre les 15 canons ; les 73 archives
sont vérifiées séparément. Ces populations ne sont pas additionnées comme
un taux de réussite produit. Suite produit complète et navigateurs : non
exécutés, aucun composant frontend modifié ; qualification ciblée sur le
parseur et la lecture.

## 5. Accès web

Navigation web externe observée pour le correctif et sa clôture : **0**.
Aucune URL externe visitée ou refusée. Pourcentages d’approbation, de refus
et d’erreur web : **N/A — dénominateur nul**. Les serveurs HTTP loopback des
fixtures sont locaux ; leurs requêtes exhaustives ne sont pas instrumentées.
La lecture native du quota n’est pas une mesure de navigation web ou de coût
propre à ce change. Aucun accès aux secrets nécessaire.

## 6. Synthèse globale

Le correctif source est validé puis archivé dans le seul dossier
2026-10-28-fix-monitor-historical-lot-codes. Le registre conserve 72
correspondances attribuées et une entrée archivée sans code : **73 archives,
aucun change actif**, 601/601 cases cochées au total documentaire.
Ces ratios ne prouvent aucune activation.

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — borne initiale exhaustive non relevée |
| Fin — après archivage | 28/10/2026 21:28:37 UTC+1, Europe/Paris ; relevé final avant rédaction |
| Durée globale (pauses et attentes incluses) | N/A — borne de début absente |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage de la spécification | 28/10/2026 21:28:37 UTC+1, Europe/Paris | 26 % | 04/11/2026 07:45:53 UTC+1, Europe/Paris |
| Différence après − avant | — | N/A — relevé initial absent | — |

Source finale : outil natif get_usage_limits, bucket codex, fenêtre de
10080 minutes. Les quotas sont partagés par le compte : ce relevé ne mesure
pas exclusivement ce change et n’est converti ni en tokens ni en euros.
Le rendu /cgpt qui écrit dans le dossier du skill n’est pas exécuté pour
respecter la limite d’écriture au projet ; sa source native est consultée
directement. Aucun relevé initial n’est recréé rétroactivement.

Déploiement, activation, publication et opération Git : **aucun effectué**.
Aucun autre change archivé par cette demande. Les données absentes restent
N/A ; les statistiques ne constituent aucune nouvelle qualification runtime.
