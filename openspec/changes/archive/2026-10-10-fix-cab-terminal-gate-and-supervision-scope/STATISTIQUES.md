# Statistiques — correctif CGP-20261010-05 à 07

Change : fix-cab-terminal-gate-and-supervision-scope.
Archive : 2026-10-10-fix-cab-terminal-gate-and-supervision-scope.
Session : SCM directe, périmètre validé explicitement par le développeur,
avec coexistence des trois changes historiques et archivage de ce seul correctif.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex — identifiant exact N/A | N/A | OpenAI | N/A | N/A | N/A | N/A |

L'identifiant exact du modèle, sa version, son raisonnement et ses durées
actives ne sont pas fournis par les preuves collectées. Aucun débit ni temps
de génération n'est déduit de la durée des commandes.

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent orchestrateur piloté | N/A | N/A | N/A | N/A | N/A | N/A |

Aucun agent OpenCode ou sous-agent n'a été piloté. Le skill de statistiques,
les sondes et les benchmarks de modèle n'ont pas été invoqués en SCM.

## 1. Statistiques générales et décisions

Les résultats ci-dessous reposent sur les sorties natives observées, les
empreintes des fichiers et un journal partiel de 18 commandes de validation,
reproduction et contrôle. Ce journal n'est pas un inventaire exhaustif des
lectures, éditions, appels d'outils ou processus enfants. Une première collecte
de sortie a échoué sur une valeur undefined non sérialisable ; sa commande,
sans sortie conservée, est exclue des comptes. La réexécution est consignée.

Un exit 0 signifie une réussite technique observée, pas une approbation
manuelle par commande. Les sorties non nulles sont qualifiées séparément :
reproduction volontaire, limite sandbox, avertissements stricts antérieurs
ou erreur de l'outil de contrôle. Aucun refus CAB ne peut être déduit d'EPERM.

| Résultat du journal partiel | Nombre | Part |
|---|---:|---:|
| Exit 0 | 13 | 72,2 % |
| Exit non nul qualifié | 5 | 27,8 % |
| Total des commandes consignées | 18 | 100 % |

| Tests finaux | Réussis | Part des 90 tests |
|---|---:|---:|
| Node | 52 | 57,8 % |
| Python | 38 | 42,2 % |
| Total | 90 | 100 % |

Les huit régressions ciblées sont incluses dans les 52 tests Node. Elles ont
d'abord toutes échoué hors sandbox sur les sources initiales, puis toutes
réussi après correction. Les essais listen EPERM ne sont pas des preuves de
reproduction fonctionnelle. Le gate renvoyait 201 au lieu de 409 ; les clients
employaient des routes incompatibles ; le trafic SSE étranger actualisait
l'horloge du job.

Une validation explicite du périmètre SCM est observable dans la conversation.
Les nombres exhaustifs d'autorisations par outil et de messages sont N/A.
Aucun mandat CAB n'a été émis. Aucun rejet d'approbation n'est présent dans
ce journal ; les limites de lecture du journal interdisent un total global
de permissions. Tokens, cache, coûts et compactages : N/A, télémétrie absente.

## 2. Types de messages et d'outils

| Famille des commandes consignées | Nombre | Part | Exit 0 | Taux exit 0 | Non nul | Taux non nul |
|---|---:|---:|---:|---:|---:|---:|
| OpenSpec | 6 | 33,3 % | 4 | 66,7 % | 2 | 33,3 % |
| Tests Node | 4 | 22,2 % | 2 | 50,0 % | 2 | 50,0 % |
| Syntaxe Node | 3 | 16,7 % | 3 | 100,0 % | 0 | 0,0 % |
| Tests Python | 1 | 5,6 % | 1 | 100,0 % | 0 | 0,0 % |
| Contrôles et nettoyage ciblé | 4 | 22,2 % | 3 | 75,0 % | 1 | 25,0 % |
| Total | 18 | 100 % | 13 | 72,2 % | 5 | 27,8 % |

Les résultats en cours des processus de test ont été rattachés à leur
commande initiale, sans compter chaque sondage comme une nouvelle commande.
Les outils d'édition et de lecture, les messages par rôle et leurs
terminaisons ne sont pas comptés exhaustivement : N/A.

Les tests utilisent des serveurs HTTP loopback et des processus simulés.
systemctl est remplacé par un exécutable de fixture ; aucun service réel n'est
installé, démarré, arrêté ni redémarré. Les 16 répertoires temporaires laissés
par les essais EPERM avant l'enregistrement des callbacks ont été supprimés
après vérification bornée de propriété, de date et de contenu synthétique.
Aucun répertoire inconnu n'a été supprimé.

## 3. Fichiers modifiés

Comparaison avec 193 fichiers sources autorisés relevés avant le correctif :
10 fichiers existants modifiés, six artefacts du change créés puis déplacés
dans l'archive, deux autres fichiers créés. Cela représente 18 chemins finaux
distincts, sans suppression de fichier initial. Les trois changes historiques,
les archives antérieures et les fichiers CGP hors périmètre sont inchangés.

| Classe de chemin final | Nombre | Part |
|---|---:|---:|
| Fichier existant modifié | 10 | 55,6 % |
| Artefact créé puis archivé | 6 | 33,3 % |
| Nouveau test et rapport | 2 | 11,1 % |
| Total | 18 | 100 % |

| Chemin absolu final | État | Part des chemins | Tentatives d'écriture |
|---|---|---:|---:|
| /home/devops/datas/cab/CHANGELOG.md | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/README.md | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/TECHNICAL.md | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-cab-terminal-gate-and-supervision-scope/.openspec.yaml | Créé puis archivé | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-cab-terminal-gate-and-supervision-scope/STATISTIQUES.md | Créé | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-cab-terminal-gate-and-supervision-scope/design.md | Créé puis archivé | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-cab-terminal-gate-and-supervision-scope/proposal.md | Créé puis archivé | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-cab-terminal-gate-and-supervision-scope/specs/controller-transport/spec.md | Créé puis archivé | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-cab-terminal-gate-and-supervision-scope/specs/persistent-job-supervision/spec.md | Créé puis archivé | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-cab-terminal-gate-and-supervision-scope/tasks.md | Créé puis archivé | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/specs/controller-transport/spec.md | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/openspec/specs/persistent-job-supervision/spec.md | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/tests/controller-configuration.test.mjs | Modifié | 5,6 % | N/A |
| /home/devops/datas/cab/tests/controller-healthcheck-compatibility.test.mjs | Créé | 5,6 % | N/A |
| /home/devops/datas/cab/tests/persistent-job-supervisor.test.mjs | Modifié | 5,6 % | N/A |
| Total | 18 chemins | 100 % | N/A |

La part par fichier est 1/18, arrondie à une décimale ; les arrondis ne
s'additionnent pas exactement. Les nombres et taux d'écritures approuvées,
refusées ou échouées par fichier sont N/A : les empreintes prouvent les états
finaux, pas un décompte exhaustif des transactions d'écriture. Les six
déplacements concernent uniquement ce change, pas les trois historiques.

## 4. Commandes

Ce tableau reprend le journal partiel défini plus haut. Les libellés sont
limités à 100 caractères, indicateur de troncature inclus. Les scripts de
contrôle longs sont désignés par leur objectif ; les commandes complètes
et les sorties observées restent dans la conversation.

| N° | Commande ou libellé court | Exit |
|---:|---|---:|
| 1 | OPENSPEC_TELEMETRY=0 /home/devops/.local/npm/bin/openspec validate fix-cab-terminal-gate-and-superv… | 0 |
| 2 | OPENSPEC_TELEMETRY=0 /home/devops/.local/npm/bin/openspec validate --specs --strict --json | 1 |
| 3 | /home/devops/node/current/bin/node --test --test-isolation=none --test-name-pattern='CGP0[567]' tes… | 1 |
| 4 | /home/devops/node/current/bin/node --test --test-isolation=none --test-name-pattern='CGP0[567]' tes… | 1 |
| 5 | /home/devops/node/current/bin/node --test --test-isolation=none --test-name-pattern='CGP0[567]' tes… | 0 |
| 6 | /home/devops/node/current/bin/node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge… | 0 |
| 7 | /home/devops/node/current/bin/node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge… | 0 |
| 8 | /home/devops/node/current/bin/node --check plugins/cab-approval-bridge/scripts/cgpt-approval-bridge… | 0 |
| 9 | /home/devops/node/current/bin/node --test --test-isolation=none tests/*.test.mjs | 0 |
| 10 | /home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p 'test_*.py' | 0 |
| 11 | Nettoyage borné des fixtures /tmp de cette session, avec signature et propriété vérifiées | 0 |
| 12 | Contrôle UTF-8/LF et revue des sections documentaires concernées | 0 |
| 13 | OPENSPEC_TELEMETRY=0 /home/devops/.local/npm/bin/openspec validate fix-cab-terminal-gate-and-superv… | 0 |
| 14 | OPENSPEC_TELEMETRY=0 /home/devops/.local/npm/bin/openspec archive fix-cab-terminal-gate-and-supervi… | 0 |
| 15 | OPENSPEC_TELEMETRY=0 /home/devops/.local/npm/bin/openspec validate --specs --strict --json | 1 |
| 16 | OPENSPEC_TELEMETRY=0 /home/devops/.local/npm/bin/openspec validate --specs --json | 0 |
| 17 | Contrôle de l'archive unique et des trois exigences synchronisées | 1 |
| 18 | Contrôle corrigé de l'archive unique et des trois exigences synchronisées | 0 |

Les cinq sorties non nulles sont :
- deux stricts globaux avec les mêmes 13 WARNING et zéro ERROR ;
- une exécution sandbox des régressions, bloquée sur listen EPERM ;
- une reproduction hors sandbox échouant volontairement sur les trois risques ;
- un contrôle de synchronisation dont l'expression régulière englobait le
  corps dans le titre ; le contrôle corrigé a ensuite prouvé les trois exigences.

Aucune commande refusée par une décision d'approbation n'est observée dans ce
journal. Aucune de ces sorties n'est présentée comme un succès. Les trois
scripts modifiés passent node --check. Les suites finales sont exécutées avec
le Node et le Python explicitement déclarés dans DEVOPS.md.

## 5. Accès web

| Accès extérieur observé | Nombre | Part |
|---|---:|---:|
| Pages web, fournisseurs ou API distantes | 0 | N/A |
| Total extérieur | 0 | N/A |

Aucune URL extérieure visitée ou refusée n'est observée. Dénominateur nul :
aucun taux n'est calculable. Les échanges HTTP internes aux tests sont des
fixtures locales, pas des accès web extérieurs ; leur nombre exhaustif est
N/A. Aucune authentification fournisseur ni lecture de secret n'a été réalisée.

## 6. Synthèse globale

| Intervalle mesuré | Valeur |
|---|---|
| Début mesuré | 2026-10-10T17:27:10+02:00 — Europe/Paris |
| Fin après archivage et validations, avant rédaction | 2026-10-10T17:39:06+02:00 — Europe/Paris |
| Durée globale de cet intervalle | 00 h 11 min 56 s |

La première lecture DEVOPS précède le relevé initial d'horloge. L'intervalle
mesuré inclut les attentes, essais, corrections, tests et archivage à partir
de cette borne ; il ne prétend pas reconstituer une borne antérieure non
mesurée. Les contrôles de publication du présent rapport sont ultérieurs.

| Quota Codex sur sept jours | Horodatage | Utilisé | Réinitialisation |
|---|---|---:|---|
| Avant | N/A | N/A | N/A |
| Après archivage | N/A | N/A | N/A |
| Différence en points de pourcentage | N/A | N/A | N/A |

Aucun relevé de quota n'a été collecté dans cette SCM directe. Le quota du
compte est partagé ; aucune consommation exclusive, aucun token ni coût
n'est reconstruit. TTMT, débit et sondes périodiques : N/A, non activés.

Bilan : 90 tests finaux réussis, change ciblé strict valide avant archivage,
archive unique avec specsUpdated true, deux exigences ajoutées et une modifiée.
Les sept spécifications sont valides sans strict. Le strict global reste
exit 1 avec les 13 avertissements initiaux, exactement identiques par
capacité/niveau/chemin/message, et zéro ERROR.

Le correctif couvre uniquement CGP-20261010-05 à 07. La matrice documentaire
et les preuves détaillées figurent dans tasks.md de cette archive.
TECHNICAL.md, README.md et CHANGELOG.md sont actualisés ; AGENTS.md,
PROJECT.md, BUILD.md, DEVOPS.md et ORCHESTRATED_CODING.md sont inchangés
avec justification. Version source 0.87.1 conservée, sans publication ni
installation de profil. Aucun test OpenCode réel ni opération Git exécuté.
Les sources sensibles n'ont pas été consultées. Ce rapport est produit après
l'archivage, sans réarchivage ni invocation du skill de statistiques pilotées.

