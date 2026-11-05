# STATISTIQUES — add-terminal-gate

Archive : `2026-10-13-add-terminal-gate`  
Chat : `01a133bc-fdba-7b53-820b-c021d22e08c4` ; travail direct Codex, sans session OpenCode pilotée.  
Périmètre fonctionnel : gate terminal local et refus des clôtures prématurées  
Autorisation : demande explicite du développeur d'archiver les changes totalement finalisés, reçue dans ce chat.  
Fin de l'intervalle observé : 13/10/2026 10:57:16 Europe/Paris, après archivage et relevé natif du quota, avant rédaction de ce rapport.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex — modèle exact non exposé | N/A | OpenAI — client Codex | N/A | N/A | N/A | N/A |
| Agents du développement historique non identifiables dans ce chat | N/A | N/A | N/A | N/A | N/A | N/A |

Le modèle, sa version et le raisonnement ne sont pas fournis par la lecture native de l'historique. Sondes périodiques non activées ; temps de service et dénominateur indisponibles. Les durées calendaires ci-dessous ne représentent pas le temps de génération.

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent orchestrateur distinct identifiable | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

- Tâches constatées avant archivage : **6/6 (100,0 %)** ; aucune tâche ouverte.
- Deltas de ce change identiques aux exigences de référence avant archivage.
- Validation préalable du lot : **14/14 éléments OpenSpec stricts (100 %)**, sans avertissement ni collision.
- Archivage courant : **1/1 commande réussie (100 %)**, code retour 0 ; `specsUpdated: false`, zéro exigence ajoutée, modifiée, supprimée ou renommée.
- Tokens, cache, coût, compactages et surcharge de télémétrie : **N/A**, mesures non exposées ou collecte initiale absente.
- Développement initial de ce change : hors de l'historique accessible de ce chat ; ses chiffres anciens dans tasks.md restent des preuves historiques, non des mesures réexécutées.

Les résultats suivants appartiennent au **lot partagé de corrections ACSM**, observé dans ce chat avant l'archivage. Ils ne sont pas attribuables exclusivement à ce change et ne doivent pas être additionnés entre les sept rapports.

| Suite partagée | Tests réussis | Part des 124 tests | Taux de réussite |
|---|---:|---:|---:|
| Restauration — Node | 27 | 21,8 % | 100 % |
| Superviseur — Node | 11 | 8,9 % | 100 % |
| Récupération — Node | 16 | 12,9 % | 100 % |
| Configuration — Node | 13 | 10,5 % | 100 % |
| Compatibilité — Node | 6 | 4,8 % | 100 % |
| Distribution — Node | 13 | 10,5 % | 100 % |
| Broker — Python | 38 | 30,6 % | 100 % |
| **Total partagé** | **124** | **100 %** | **100 %** |

Une commande terminée avec code 0 prouve son exécution réussie, pas une approbation manuelle unitaire. Les décisions natives de permission ne sont pas exposées dans la source statistique : leurs effectifs restent N/A. Les sorties non nulles sont distinguées des refus ; certaines correspondent aux reproductions attendues avant correction.

## 2. Types de messages et d'outils

Source : `mcp__codex_app__read_thread`, cinq tours antérieurs à la demande d'archivage, page complète sans pagination restante, arrêtés à 13/10/2026 10:23:54 Europe/Paris. La demande d'archivage, ses lectures, quotas et publications de rapports sont hors de ce relevé historique. Seuls les types, statuts et métadonnées sont agrégés ; aucun contenu de raisonnement n'est reproduit.

| Type natif observé — partagé entre rapports | Nombre | Part des 238 éléments |
|---|---:|---:|
| Messages développeur | 4 | 1,7 % |
| Messages agent | 17 | 7,1 % |
| Éléments de raisonnement — métadonnées seulement | 70 | 29,4 % |
| Exécutions de commandes | 136 | 57,1 % |
| Opérations natives de fichiers | 9 | 3,8 % |
| Appels MCP | 2 | 0,8 % |
| **Total observé** | **238** | **100 %** |

Messages utilisateur et agent : **21/21 (100 %)**, dont 4 développeur (19,0 %) et 17 agent (81,0 %). Les pourcentages sont arrondis à une décimale.

## 3. Fichiers modifiés

Ces chemins ont été déplacés ensemble par l'archivage courant, sans réécriture des exigences de référence :

| Chemin absolu dans l'archive | Déplacements observés | Part des 5 fichiers déplacés | Écritures historiques approuvées, refusées ou en erreur |
|---|---:|---:|---|
| /home/devops/datas/cab/openspec/changes/archive/2026-10-13-add-terminal-gate/.openspec.yaml | 1 | 20,0 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-13-add-terminal-gate/design.md | 1 | 20,0 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-13-add-terminal-gate/proposal.md | 1 | 20,0 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-13-add-terminal-gate/specs/controller-transport/spec.md | 1 | 20,0 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-13-add-terminal-gate/tasks.md | 1 | 20,0 % | N/A |
| **Total déplacé** | **5** | **100 %** | **N/A** |

Rapport produit séparément : `/home/devops/datas/cab/openspec/changes/archive/2026-10-13-add-terminal-gate/STATISTIQUES.md`. Sa rédaction est hors de l'intervalle mesuré avant synthèse.

La trace native antérieure expose **9/9 opérations de fichiers terminées (100 %)**, soit **27 occurrences sur 24 chemins distincts**, pour tout le chat. Les écritures réalisées dans des scripts ne sont pas détaillées par fichier : le nombre réel de tentatives, leurs taux d'approbation/refus/erreur et leur attribution par change restent **N/A**. Les 27 occurrences sont un sous-ensemble instrumenté, pas un total exhaustif des écritures.

## 4. Commandes

| Périmètre | Nombre | Réussies | Sortie non nulle | Part |
|---|---:|---:|---:|---:|
| Commandes natives des cinq tours antérieurs | 136 | 130 (95,6 %) | 6 (4,4 %) | 100 % |
| Archivage propre à ce rapport | 1 | 1 (100 %) | 0 (0 %) | 100 % |

Commande courante : `openspec archive add-terminal-gate --yes --json`. Exécutée depuis `/home/devops/datas/cab` avec le binaire OpenSpec de DEVOPS.md et la télémétrie désactivée. Résultat natif : archive `2026-10-13-add-terminal-gate`, aucune mise à jour de spécification.

Commandes refusées : **N/A — journal de décisions de permission non exposé**. Les six commandes historiques de sortie non nulle incluent les contrôles/reproductions avant correction et une restriction technique du sandbox ; elles ne prouvent pas six refus d'autorisation. Les tests HTTP finaux ont utilisé des services simulés en loopback, après autorisation technique hors sandbox, avec temporaires confinés au projet.

## 5. Accès web

Aucune visite web externe effectuée dans ce chat ; les URL lues dans la documentation ne sont pas des visites.

| Accès web externes observés | Réussis | Refusés | En erreur | Taux |
|---:|---:|---:|---:|---|
| 0 | 0 | 0 | 0 | N/A — dénominateur nul |

URL effectivement visitée : aucune. Les API locales simulées des tests et les outils natifs de l'application sont distingués des visites web.

## 6. Synthèse globale

| Durée de la session observée — commune au chat | Valeur |
|---|---|
| Début du chat observé, analyse ACSM incluse | 13/10/2026 07:29:48 Europe/Paris |
| Fin — après cet archivage et relevé final | 13/10/2026 10:57:16 Europe/Paris |
| Durée observée, pauses et autres changes inclus | 3 h 27 min 28 s |
| Début et durée complets du développement propre à ce change | N/A — développement historique hors de ce chat |

Les bornes du chat proviennent de l'historique natif. Cette durée est commune aux travaux du lot et ne mesure pas une durée exclusive par change. La rédaction ultérieure du rapport est exclue.

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début du développement | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage | 13/10/2026 10:57:16 Europe/Paris | 3 % | 20/10/2026 06:59:31 Europe/Paris |
| Différence après − avant | — | N/A — relevé initial absent | — |

Source finale : outil natif `mcp__codex_app__get_usage_limits`, quota `codex`, fenêtre `10080` minutes. Les quotas sont partagés par le compte ; aucune consommation exclusive, conversion en tokens ou estimation de coût n'est effectuée.

| Domaine natif historique — sous-ensemble instrumenté partagé | Nombre | Part des 147 appels/opérations | Réussis ou terminés | Sortie non nulle |
|---|---:|---:|---:|---:|
| Commandes | 136 | 92,5 % | 130 (95,6 %) | 6 (4,4 %) |
| Opérations de fichiers | 9 | 6,1 % | 9 (100 %) | 0 (0 %) |
| Autres outils MCP | 2 | 1,4 % | 2 (100 %) | 0 (0 %) |
| Web externe | 0 | 0 % | 0 (N/A) | 0 (N/A) |
| **Total observé** | **147** | **100 %** | **141 (95,9 %)** | **6 (4,1 %)** |

Les refus de permission restent N/A ; les statuts terminés des outils ne prouvent pas leurs effets métier. Cette agrégation exclut les écritures internes des scripts et les opérations du tour d'archivage.

Les mentions historiques de change ouvert ou d'absence d'archivage décrivent l'état avant la demande actuelle ; la preuve native ci-dessous et le dossier d'archive établissent la clôture.

État : change archivé avec succès ; rapport distinct publié dans son archive. Tests de sources partagés réussis ; intégration sur services réels non exécutée. Références préalablement synchronisées, aucune nouvelle fonctionnalité ni changement de version à l'archivage. Git non inspecté, aucun commit ou push. Aucun secret lu, ajouté ou publié. Le contrôle final du lot vérifie présence, six sections, UTF-8/LF, totaux et empreintes des références.
