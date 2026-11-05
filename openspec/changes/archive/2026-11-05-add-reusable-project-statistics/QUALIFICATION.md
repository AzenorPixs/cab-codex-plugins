# Qualification — CAB 2.3.0, statistiques réutilisables

## État vérifié avant archivage

La qualification globale est réussie sur la base synchronisée avec la version
publiée2.2.40. Les corrections transverses sont réalisées dans le périmètre
validé. La brique Statistiques du moniteur et l’interface CLI/JSON agnostique
sont qualifiées. Archivage et livraison suivent ces contrôles ; aucun CABU
ou démarrage de runtime n’est réalisé dans cette session.

## Résultats finaux

| Contrôle | Résultat | Portée |
|---|---|---|
| Python syntaxique | 24 fichiers, code0 | src, scripts et tests Python présents |
| Python global | 185 réussis,0échec | Dont49SGS, agents tiers et requêtes sans mutation |
| Node global séquentiel | 1315cas :1284réussis,31ignorés,0échec | 1284exécutés ; enveloppe code0,394811ms |
| Node ciblé après QUERY | 10/10 réussis | Distribution et sonde SGS réelle |
| Chromium156.0.8078.79 | Qualification réussie | Bureau/mobile, six cartes, états et contrôles |
| Firefox153.6.0 | Qualification réussie | Même recette après synchronisation amont |
| OpenSpec global strict | 21/21 réussis | 20spécifications et le présent change |
| Skill SGS | quick_validate.py réussi | Structure et frontmatter |
| Diff CAB | git diff --check réussi | Ensemble des modifications |

Les résultats précédents en échec restent des essais intermédiaires dans
l’historique, sans addition à ces totaux finaux. Les31cas ignorés sont exclus
des1469tests produit exécutés. Les deux recettes navigateur et21contrôles
OpenSpec sont documentés séparément. Les captures et résultats navigateur
sont dans output/sgs-2.3.0-browser, non versionnés.

## Couple global et interrogation

REBUILD génération6 a analysé176archives sous SGS1.19, avec les60revues
sourcées conservées dans le registre. Le rapport préexistant a été supprimé
avant recalcul, sans reprendre ses statistiques. La contribution du présent
change sera ajoutée après son archivage, une seule fois, par DELTA.
QUERY expose global/contribution/mesure avec génération et empreintes sans
mutation ; INSPECT consulte aussi les changes ouverts. Un état absent,
divergent, occupé ou en transaction est testé. Les identités de codeur et
d’orchestrateur libres sont conservées sans runtime CAB.

## Réconciliation amont

La tête GitHub2ffa370f8ba87c571cf2a093ff1fb976c042aa86 publie2.2.40.
Ses fichiers et son archive d’effacement sont synchronisés, sans second
archivage. La copie locale active antérieure est préservée sous
output/sgs-upstream-integration/local-active-purge. Le manifeste historique
est identique à la source publiée ; les empreintes courantes sont séparées.
La garde HMAC et les protections de pairs restent actives. Les fixtures V2
utilisent le contrat SDK courant ; les permissions natives restent contrôlées.
L’identité publique du moniteur reste minimale ; les informations internes
exigent la route de maintenance protégée.

## Références et limites d’extraction

Les187rapports Pixs ont été examinés en lecture seule ; aucun fichier Pixs n’a
été modifié ni régénéré et aucun de ses chiffres n’est une mesure de CAB.
Les fixtures riches couvrent agents, tokens/cache, performances, rôles
supplémentaires, outils/états, décisions, fichiers et commandes détaillés,
précision des bornes et populations communes. Les tableaux et notes historiques
restent présents après amendement ; les N/A ne remplacent pas des valeurs
simplement non reconnues sans revue sourcée.
Les langages analysés lexicalement par cette version sont Python,
JavaScript, HTML et CSS ; les autres restent explicitement indisponibles,
sans estimation par recherche de marqueurs. Aucun nouveau paquet installé.
Aucun export natif CAB réel n’a été importé ici faute d’export fourni et
rattaché ; le chemin d’import et ses refus ont été qualifiés sur données
synthétiques. Aucun état privé ni credential lu.

## Cohérence documentaire et livraison

PROJECT.md, TECHNICAL.md, BUILD.md, README.md et CHANGELOG.md décrivent2.3.0.
Le skill, le schéma, la commande SGS et les paquets CAB/CABU sont cohérents.
SGS1.19 et ses douze points d’appel restent dans le projet prompts ; leur
publication n’est pas incluse dans celle de CAB. Le canon OpenSpec sera
synchronisé par l’archivage normal du seul change qualifié. Les cartes de
navigation seront amendées sur cette preuve ; aucun code de lot inventé.

La commande SCM autorisée est `sudo -n /usr/local/bin/diu projects cicd cab 2.3.0`.
Le contrôle sudo exact a réussi. Son exécution exige l’archivage réussi, le
rapport final et le global vérifié ; elle n’est pas encore revendiquée ici.
La SCM inclut les modifications versionnées préexistantes. La réconciliation
DIU préserve les deux historiques avec bail sur la tête distante attendue.
Publication et activation restent des états distincts.


## Matrice documentaire finale

| Document | État vérifié |
|---|---|
| Projet réel | Mis à jour : moteur, requêtes et sixième carte ; tests finaux ci-dessus |
| AGENTS.md | Inchangé dans cette évolution : cadre SCM direct et gardes applicables |
| PROJECT.md | Mis à jour : section Statistiques de projet et de change2.3.0 |
| TECHNICAL.md | Mis à jour : architecture du moteur ; schéma référencé dans le skill |
| BUILD.md | Mis à jour : moteur, skill, commande et distribution du moniteur |
| DEVOPS.md | Inchangé par cette évolution : résolution locale des prompts et outils |
| DEVELOPMENT_MAP.md | Amendement ciblé du change avec qualification/archive liées, aucun code attribué |
| openspec/BATCH_CODES.md | Même amendement ciblé ; convergence ACL recommandée |
| README.md | Mis à jour : usages manuel/delta, requêtes agnostiques, carte Statistiques |
| CHANGELOG.md | Entrée2.3.0 avec moteur, interface, carte et corrections qualifiées |
| OpenSpec | Canon synchronisé par archivage normal ;11exigences ajoutées, Purpose renseigné |
| Référentiel prompts | SGS1.19, INDEX et douze points d’appel ; modifications locales distinctes de CAB |

## Archivage vérifié

OpenSpec archive --yes --json a réussi :2026-11-05-add-reusable-project-statistics,
specsUpdated=true et11exigences ajoutées. Aucun saut de validation ni second
archivage. Le rapport existant est amendé dans ce même dossier par CHANGE,
puis sa contribution ajoutée au global par DELTA ; générations et empreintes
contrôlées ensuite.


## Rapport final et maintenance vérifiés

CHANGE --state archived --maintain-global a réussi :NCA177,génération7.
VERIFY --sources a confirmé le couple, les sources, les index et le rendu,
sans transaction en attente. Le même rapport comporte six sections UTF-8/LF,
conserve le relevé de blocage et ajoute le relevé final cumulatif :1469tests
produit réussis et234commandes natives observées(219code0,15non nuls).
Le bilan de blocage résolu a été supprimé ensuite dans cette seule archive,
et les liens courants devenus caducs ont été retirés. Un dernier DELTA
actualise l’empreinte du rapport après ce nettoyage, sans seconde contribution.


Contrôle final après nettoyage : VERIFY --sources réussi, NCA177, génération8,
aucune transaction en attente. QUERY a renvoyé1469tests pour cette seule archive,
avec statut queried et mutated=false. Le delta a remplacé son empreinte sans
modifier NCA.
