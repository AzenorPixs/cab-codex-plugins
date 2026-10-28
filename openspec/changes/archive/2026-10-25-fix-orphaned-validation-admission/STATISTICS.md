# Rapport d'archivage SCM — fix-orphaned-validation-admission

Projet : Codex Approval Bridge (cab). Version source : 1.8.0.
Date : 25 octobre 2026, Europe/Paris. Session directe SCM.
Archive réelle : 2026-10-25-fix-orphaned-validation-admission.

## 1. Statistiques générales et décisions

L1 corrige l'admission des validations après les gardes natives et la
persistance groupée propriétaire/opération. Une réconciliation explicite du
prévol coordonné prouvé sans effet crée seulement REJECTION_ONLY. Le rejet
MCP corrélé permet ensuite le retry existant, sans permission rejouée.
Ce traitement ne normalise pas une ancienne demande legacy non routée.

| Qualification finale commune L1/L2 | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node | 363 | 0 | 1 | 364 |
| Python | 72 | 0 | 0 | 72 |
| Total distinct partagé | 435 | 0 | 1 | 436 |

Réussite des cas exécutés : 435/435, soit 100 %. Cas ignorés : 1/436,
soit 0,23 %. Les 28 scénarios bootstrap, les trois tests de projection et
les répétitions ciblées sont inclus dans Node. Ces mesures sont communes
aux deux changes et ne doivent jamais être additionnées entre archives.
Attribution exclusive par change : N/A, la suite finale n'est pas découpée
en télémétries séparées. Chromium et Firefox sont qualifiés séparément.

RUN de pilotage SCM : N/A, session directe sans RUN CAB de codage. Modèle
exact mesuré, tokens, coûts, quotas, cache, débit et durée exhaustive : N/A,
aucune télémétrie de pilotage normalisée n'est activée par SCM. Aucune
consultation de quota ou compétence de statistiques pilotées n'est déclenchée.

## 2. Types de messages et d'outils

Lectures ciblées, rg, empreintes, éditions locales, syntaxe Node/Python,
fixtures HTTP/SSE et processus isolés, adaptateur de services, navigateurs et
CLI OpenSpec. Des observations natives en lecture seule et des transmissions
du chat propriétaire éclairent la proposition opérationnelle ; elles ne
constituent ni des décisions ni des autorisations d'intervention.

Nombre exhaustif de messages, appels, refus et décisions : N/A, absence de
collecte SCM normalisée. Aucun sous-agent, pilotage produit OpenCode,
commande Git, installation, mutation Pixs ou service réel modifié. Les
identités non secrètes PROJECT_NAME/PROJECT_ID sont extraites localement sans
restituer le fichier project.env.

## 3. Fichiers et cohérence documentaire

Le lot L1 touche controller, job-context, runs, resource-coordination, trois
fichiers de tests ciblés, TECHNICAL.md, BUILD.md et ses artefacts OpenSpec.
La reprise SCM aligne aussi les annonces et supports de distribution en 1.8.0
dans le périmètre commun L2. L'inventaire par empreintes est conservé dans
.cab-scm-1.8.0-work/source-final.json ; il ne prétend pas reconstituer les
changements L1 déjà présents avant sa base. QUALIFICATION.md conserve
l'historique initial et le bilan SCM final, sans effacer les anciens échecs.

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte de base conservée ; règles et sécurité préservées. |
| PROJECT.md | Mis à jour : référence 1.8.0, capacités et pilotage concurrent. |
| TECHNICAL.md | Mis à jour : admission, API de réconciliation et limites. |
| BUILD.md | Mis à jour : chargement prouvé, distribution et incompatibilité après reçu. |
| DEVOPS.md | Inchangé, empreinte de base conservée ; chemins de runtimes utilisés. |
| README.md | Mis à jour : prévol orphelin, maintenance et versions actives distinctes. |
| CHANGELOG.md | Entrée unique 1.8.0 de préparation source, historique conservé. |
| openspec/specs/ | Cinq exigences L1 ajoutées à trois capacités par l'archivage natif. |
| Protocole et références | Cohérence distribuée rétablie, comparaisons documentaires réussies. |

Les écritures restent sous CAB. Aucun secret n'est lu ou livré. Les textes
livrés sont vérifiés UTF-8/LF. Les trois copies broker sont identiques à src/.

## 4. Commandes et résultats

- node --test tests/*.test.mjs : exécutée et réussie, 363/364 avec un ignoré,
  aucun échec, 124778,236659 ms ; node-release.txt.
- python3 -m unittest discover -s tests -p 'test_*.py' : exécutée et réussie,
  72/72, 4,428 s ; python-release.txt.
- node --check et python3 -m py_compile : exécutées et réussies pour 40
  fichiers concernés ; source-final.json. Les cinq corps de garde originaux
  et les trois copies distribuées sont également comparés avec succès.
- node tests/web-monitor-browser.mjs : exécutée et réussie sous Chromium et
  Firefox ; browser-tests.txt. Le lancement par lien du moniteur a ensuite
  changé, sans modification visuelle, et est couvert par les processus réels.
- openspec validate --all --strict --json : exécutée et réussie avant
  archivage, 15/15 dont les deux changes ; openspec-release-before-archive.json.
- openspec archive fix-orphaned-validation-admission --yes --json : exécutée
  et réussie, code 0 ; archive-l1.json. Cinq exigences ajoutées, aucune
  modifiée, supprimée ou renommée. Aucun réarchivage.
- openspec validate --all --strict --json après les deux archives : exécutée
  et réussie, 13/13 canons ; openspec-release-after-archive.json.

Toutes les traces sont sous .cab-scm-1.8.0-work, les caches temporaires aussi.
Node et Python utilisent les chemins déclarés dans DEVOPS.md. Tests OpenCode
produit opt-in : non exécutés. Installation et services réels : non exécutés,
hors périmètre. Lint, types et construction distincte : non disponibles,
aucune chaîne configurée. ShellCheck : non pertinent, aucun shell modifié.
Les erreurs intermédiaires et leur correction figurent dans QUALIFICATION.md
et dans la qualification du L2 ; elles ne sont pas masquées par le bilan final.

## 5. Accès web

Aucune recherche web externe. Les essais utilisent des fixtures loopback ;
le diagnostic produit ne comporte que des lectures autorisées. Aucun magasin
privé ou secret n'est consulté. Volume exhaustif des appels : N/A, absence
de collecte normalisée. Les appels MCP et HTTP de fixture ne sont pas des
interventions sur le broker vivant.

## 6. Synthèse globale

L1 est archivé avec ses cinq exigences canoniques et ce rapport individuel.
La qualification finale source commune est verte : 435 réussis, un ignoré,
40 vérifications syntaxiques, trois copies broker et cinq gardes identiques.
Ces résultats partagés ne se cumulent pas avec le rapport L2.

L'activation, la résolution de la demande legacy non routée, les pauses des
pairs et les autorisations de maintenance restent distinctes. Aucun runtime
1.8.0 vivant, prévol réparé ou mandat métier repris n'est déclaré à partir de
cet archivage. La proposition opérationnelle actualisée est portée par
ACTIVATION.md du change support-frozen-recovery-controller-maintenance.
