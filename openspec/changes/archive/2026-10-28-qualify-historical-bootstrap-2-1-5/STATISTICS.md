# Statistiques — Qualification historique CAB 1.7.1 vers 2.1.5

Date : 28 octobre 2026, Europe/Paris. Change : qualify-historical-bootstrap-2-1-5.
Archive : 2026-10-28-qualify-historical-bootstrap-2-1-5.
Session directe ; réalisation, qualification puis archivage conditionné au succès
d’un nouveau passage global complet. Les travaux 2.1.6 concurrents sont exclus.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex — modèle exact non exposé par une télémétrie de ce change | N/A | OpenAI | N/A | N/A | N/A | N/A |

Sondes périodiques non activées. Durées actives cumulées et dénominateur du
temps de service absents ; aucune estimation rétroactive.

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent orchestrateur — session directe | N/A | N/A | N/A | N/A | N/A | N/A |

La coordination avec une autre conversation du même projet ne constitue pas
une délégation de réalisation de ce change. Ses tests 2.1.6 ne sont pas agrégés.

## 1. Statistiques générales et décisions

Le développeur a autorisé la recherche du paquet historique, l’alignement
OpenSpec et des tests vers 2.1.5, puis demandé un nouveau passage global
complet et l’archivage seulement en cas de succès, sans déploiement ni activation.
Cette condition a été satisfaite avant l’unique archivage natif.

| Suite finale complète 2.1.5 | Déclarés | Réussis | Échecs | Ignorés | Part des cas distincts |
|---|---:|---:|---:|---:|---:|
| Node | 494 | 494 | 0 | 0 | 87,1 % |
| Python | 73 | 73 | 0 | 0 | 12,9 % |
| Total distinct | 567 | 567 | 0 | 0 | 100 % |

Taux de réussite final : 100 %. Les 25 scénarios historiques et leurs huit
sous-tests représentent 33 cas inclus dans Node : ils ne sont pas ajoutés
une seconde fois. Les quatre tâches du change sont cochées sur preuves : 4/4.

Le paquet original est extrait du commit local
e76c7e915ba0094a41b4f79fe90487c2571419dd. Son manifeste annonce
1.7.1+codex.20261020164727 et le contrôleur correspond au SHA-256 épinglé :
3cfb31247836605ea0f04fec4d4ff449c0fc34e8c5b5ee97382d379bfb40913b.
Les 29 fichiers publics extraits sont restés inchangés. Cette identité est
vérifiée contre l’artefact de référence et Git, sans prétendre à une signature
indépendante d’éditeur.

Durée exhaustive de la réalisation, tokens, cache, coûts et compactions :
N/A — collecte exhaustive absente. Les durées de commandes ne sont pas des
mesures du temps de génération du modèle.

## 2. Types de messages et d’outils

Sources : historique visible de ce travail, demandes humaines, proposition,
tâches, conception, [QUALIFICATION.md](QUALIFICATION.md) et journaux locaux.
Les outils employés couvrent lectures, recherches ciblées, Git en lecture,
éditions, empreintes, Node, Python et OpenSpec. Aucun sous-agent lancé.

Un appel autorisé réussi ne prouve pas une approbation manuelle unitaire.
Un refus exige une trace explicite de permission refusée ; un test échoué
ou une erreur technique n’est pas un refus. Les décisions et permissions
simulées du banc ne sont pas des approbations humaines ou CAB réelles.

Effectifs exhaustifs de messages, appels, écritures approuvées, refusées et
en erreur, ainsi que leurs parts : N/A — absence de compteur complet agrégé.
Aucun refus explicite de permission observé dans le périmètre.

Les échecs intermédiaires sont conservés : annonce publique ajoutée au hash,
attentes de version anciennes, fixtures incomplètes, injection de panne
répétée artificiellement et preuve de processus devenue périmée.
Un passage Node antérieur avait 493 réussites et un échec d’assertion sur
494 cas ; le banc a ensuite été corrigé et revalidé, puis la présente suite
globale complète a été réexécutée avec 494/494. Aucun de ces essais n’est
additionné aux 567 cas distincts finaux.

## 3. Fichiers modifiés

Réalisation : six fichiers existants modifiés et six artefacts du change
créés. L’archivage déplace ces six artefacts, puis ajoute ce rapport.
Le périmètre logique final comporte treize chemins : six existants (46,2 %)
et sept nouveaux (53,8 %), total 100 %. Ces nombres ne sont pas des tentatives
d’écriture ; leurs taux d’approbation, refus et erreur restent N/A.

| Chemin final absolu | Rôle |
|---|---|
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs | Exclusion de la seule annonce reconnue du protocole, données métier protégées |
| /home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs | Alignement de version, fixtures et régressions de sécurité |
| /home/devops/datas/cab/openspec/specs/active-component-update/spec.md | Trois exigences rapprochées et exigence d’empreinte stable |
| /home/devops/datas/cab/CHANGELOG.md | Note source non publiée |
| /home/devops/datas/cab/openspec/BATCH_CODES.md | Entrée sans code et chemin d’archive |
| /home/devops/datas/cab/DEVELOPMENT_MAP.md | Qualification, preuves et état archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-qualify-historical-bootstrap-2-1-5/.openspec.yaml | Métadonnées déplacées |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-qualify-historical-bootstrap-2-1-5/proposal.md | Proposition déplacée |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-qualify-historical-bootstrap-2-1-5/design.md | Conception et isolation |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-qualify-historical-bootstrap-2-1-5/tasks.md | Quatre tâches validées et note de clôture |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-qualify-historical-bootstrap-2-1-5/specs/active-component-update/spec.md | Delta conservé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-qualify-historical-bootstrap-2-1-5/QUALIFICATION.md | Provenance, résultats et liens corrigés après déplacement |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-28-qualify-historical-bootstrap-2-1-5/STATISTICS.md | Présent rapport |

Les six artefacts déplacés ont été comparés avant les amendements de clôture.
Le canon était déjà identique aux quatre exigences du delta : specsUpdated=false,
zéro exigence ajoutée, modifiée, supprimée ou renommée durant l’archive.
Les travaux 2.1.6 et les codes existants sont préservés. Aucun code attribué
à ce change par cette opération ; son entrée reste explicitement sans code.

## 4. Commandes

La suite finale est celle du snapshot complet 2.1.5 : le projet commun
passait en parallèle à 2.1.6. Une copie isolée de 726 fichiers publics est
reconstruite depuis le commit de base
7dcd49605963d9435b40a327b5f025af3390adc5 et les sources qualifiées conservées.
Ses empreintes sont restées identiques pendant le passage. Ce résultat ne
qualifie pas les sources concurrentes 2.1.6.

| Commande ou famille | Résultat |
|---|---|
| node --test tests/*.test.mjs | 494/494, 100 %, aucun échec ni saut ; durée 182,384 s |
| Python DevOps -B -m unittest discover -s tests -p test_*.py | 73/73, 100 %, aucun échec ; durée 5,852 s |
| node --check sur les deux fichiers JavaScript modifiés | 2/2, 100 % |
| openspec validate qualify-historical-bootstrap-2-1-5 --strict --type change | Valide avant archive |
| openspec archive qualify-historical-bootstrap-2-1-5 --yes --json | Réussi une fois, sans modification du canon |
| openspec validate --all --json --report findings | Après archive : 16/16, 100 %, aucun problème |
| openspec validate --all --strict --json --report findings | Après archive : 16/16, 100 %, aucun problème |
| openspec validate --archived --strict --json --report findings | 75/75, 100 %, aucun problème |

Les 16 éléments globaux comprennent 15 canons et le change 2.1.6 encore actif.
Ce contrôle documentaire n’atteste pas ses tests fonctionnels. Les durées des
deux suites ne sont pas additionnées en durée calendaire : elles sont lancées
en parallèle. Nombre exhaustif d’exécutions par famille et parts correspondantes :
N/A. Aucune commande refusée par une permission dans les traces disponibles.

Les variables CAB_TEST_ORIGINAL_PLUGIN et CAB_TEST_OPENCODE sont fournies :
les tests historiques et le test OpenCode natif isolé ne sont pas désactivés.
Les répertoires temporaires sont sous le projet ; aucun profil réel, service
utilisateur ou RUN existant n’est déployé ou activé.

- [Snapshot complet](../../../../output/historical-bootstrap-2.1.5/global-recheck/SNAPSHOT.json)
- [Journal Node final complet](../../../../output/historical-bootstrap-2.1.5/global-recheck/node-full.log)
- [Journal Python final complet](../../../../output/historical-bootstrap-2.1.5/global-recheck/python-full.log)
- [Provenance originale](../../../../output/historical-bootstrap-2.1.5/PROVENANCE.json)
- [Paquet cible qualifié](../../../../output/historical-bootstrap-2.1.5/TARGET-PROVENANCE.json)

## 5. Accès web

Recherche ou navigation web externe : 0. Aucune URL visitée ou refusée dans
ce travail. Les taux d’approbation, refus et erreur web valent N/A, dénominateur
nul. Le paquet est retrouvé dans Git local, sans téléchargement externe.

Les communications de test utilisent des fixtures HTTP/SSE loopback et des
processus OpenCode isolés. Aucun appel fournisseur LLM réel n’est nécessaire.
Le nombre exhaustif de requêtes locales n’est pas instrumenté. La consultation
native du quota partagé du compte est distincte de la navigation web et des
statistiques du banc. Les credentials de fixtures sont synthétiques ; aucun
secret réel n’est lu par le modèle ou recopié dans le rapport.

## 6. Synthèse globale

Suite globale complète 2.1.5 validée dans une copie cohérente isolée :
**567/567 cas distincts réussis, aucun échec ni saut**. Les 25 anciens cas
ignorés sont exécutés, avec leurs huit sous-tests. Le paquet historique et
le snapshot de validation sont conservés avec leurs empreintes.

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — borne initiale exhaustive non collectée |
| Fin — après archivage | 28/10/2026 22:31:00 UTC+1, Europe/Paris ; relevé avant rédaction |
| Durée globale, pauses et attentes incluses | N/A — borne de début absente |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage de la spécification | 28/10/2026 22:31:00 UTC+1, Europe/Paris | 50 % | 04/11/2026 07:45:53 UTC+1, Europe/Paris |
| Différence après − avant | — | N/A — relevé initial absent | — |

Source finale : get_usage_limits, bucket codex, fenêtre de 10080 minutes.
Le compte est partagé : la mesure ne représente pas la consommation exclusive
du change et n’est convertie ni en tokens ni en euros. Le début n’est pas
reconstitué rétroactivement ; aucun rendu /cgpt n’est écrit hors du projet.

État final : archive réelle présente, quatre tâches validées, six sections
statistiques, registre et cartographie actualisés. Une autre session conserve
le change 2.1.6 actif. Aucun autre archivage effectué dans cette demande.
Aucun déploiement, activation, publication, commit, tag ou push effectué.

Contrôle documentaire final : six sections, neuf fichiers UTF-8/LF, 526 liens locaux vérifiés avant ajout des deux liens de bilan, 74 codes existants conservés et entrée concurrente intacte. Aucun processus de fixture restant ; six répertoires résiduels de la suite générale nettoyés après contrôle. [Bilan structuré final](../../../../output/historical-bootstrap-2.1.5/global-recheck/FINAL-RESULTS.json).
