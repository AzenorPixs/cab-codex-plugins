# Rapport d'archivage SCM — start-monitor-with-cab

Projet : Codex Approval Bridge (`cab`). Date : 20 octobre 2026, Europe/Paris.
Livraison source : **1.6.1**. Session directe SCM.
Archive : `{{ARCHIVE}}`.

## 1. Statistiques générales et décisions

Je livre l'intégration du service indépendant de monitoring dans /cab start.
La commande prépare son jeu installé, démarre explicitement l'unité avant le
contrôleur et vérifie service, page, version et workspace. Une instance active
conforme est réutilisée sans redémarrage ni modification de configuration.
/cab stop et le reset préservent le moniteur pour observer les autres briques
indisponibles. Les diagnostics de monitoring restent distincts du statut CAB.

Le jeu source initial annonçait 1.6.0 ; les briques et supports courants sont
alignés sur la cible 1.6.1, avec cachebuster neuf. Les archives et l'historique
1.6.0 restent conservés. Aucun déploiement ou démarrage n'a été effectué sur
le profil utilisateur réel.

| Validation finale | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, toutes les suites MJS en série | 276 | 0 | 1 | 277 |
| Python, découverte unittest | 59 | 0 | 0 | 59 |
| Total distinct | **335** | **0** | **1** | **336** |

Le scénario OpenCode réel est ignoré, opt-in absent. Les répétitions ciblées
ne sont pas additionnées. **30 fichiers** passent la syntaxe et **22 modules
sources** annoncent 1.6.1. Le contrôle systemd statique de l'unité retourne 0.

Chromium 155.0.8059.79 et Firefox 153.5.0 passent chacun vingt-deux groupes de
vérifications, incluant MONITOR, ETAT/ÉTAPE, versions, historique, couleurs,
SSE, pannes, filtres, navigation STATS, fenêtres, annulation et purge sur
fixtures, protection des contextes actifs et affichage mobile. Les captures
MONITOR et STATS sont examinées. Ces groupes ne sont pas ajoutés aux tests Node.

OpenSpec strict : **12/12** avant archivage ; {{POST_VALIDATE}} après
synchronisation. Archivage : {{ARCHIVE_PROOF}}.

Modèle exact, tokens, coût, cache, quotas, TTMT, débit, durée exhaustive et
comptages complets des messages ou outils : **N/A**, aucune télémétrie de
pilotage normalisée collectée en SCM. Aucune compétence de statistiques
pilotées invoquée, aucun sous-agent ni orchestrateur distinct lancé.

## 2. Types de messages et d'outils

Lectures ciblées, recherches rg, empreintes, éditions locales, contrôles de
syntaxe, tests Node/Python, vérification statique systemd, navigateurs
headless et CLI OpenSpec. L'identité non secrète PROJECT_NAME/PROJECT_ID a
été extraite localement selon le filtrage autorisé ; aucun autre contenu de
project.env n'a été exposé. Aucune commande Git n'a été exécutée.

La commande /cab est un protocole Markdown versionné destiné à l'agent.
L'intégration modifie donc ce protocole et sa référence distribuée, et non
un CLI natif autonome inexistant. Les actions réelles daemon-reload et start
appartiennent à une invocation explicite ultérieure de /cab start. Cette
session n'a ni installé d'unité réelle, ni activé de service, ni créé de
heartbeat, permission, décision ou mandat de production.

Les tests emploient des services et profils isolés. Le nouveau test copie
les six modules et quatre ressources du jeu documenté, puis lance son entrée
isolée selon le modèle ExecStart, sans composants amont. Il vérifie page,
assets et identité HTTP, y compris chemins avec espaces. Le test de port
occupé vérifie le refus sans interrompre le propriétaire. La syntaxe de l'unité
et l'absence de dépendances aux autres services sont vérifiées séparément.

## 3. Fichiers modifiés

{{FILE_INVENTORY}}

Le contrôle initial suit 82 fichiers par empreinte et ajoute les seuls
artefacts identifiés du périmètre. UTF-8/LF est contrôlé sur cet ensemble,
sans prétendre inventorier d'éventuelles modifications externes de tout le
disque. Les traces et captures sont dans `.monitor-work/` ; les répertoires
et processus des fixtures sont nettoyés par les tests.

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte conservée ; aucune nouvelle règle d'agent. |
| PROJECT.md | Version cible et section 5.3.1 : démarrage explicite, réutilisation et indépendance. |
| TECHNICAL.md | Modèles de services et section Démarrage du service web par /cab start : identité, erreurs et conservation. |
| BUILD.md | Jeu installé complet, référence monitor-service, déclenchement différé et préservation des fonctions 1.6.0. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes et chemins de qualification utilisés. |
| README.md | /cab start devient le lancement intégré ; lancement manuel et diagnostic indépendant conservés. |
| CHANGELOG.md | Entrée 1.6.1 de préparation source, historique 1.6.0 et antérieur conservé. |
| openspec/specs/ | Quatre capacités synchronisées ; {{POST_VALIDATE}} après archivage. |
| ORCHESTRATED_CODING.md | Version et démarrage indépendant documentés sans modifier les mandats ou le gate. |
| Commande, skill et reset | Référence de service, ordre de démarrage et maintien explicite du moniteur à l'arrêt/reset. |
| Sources et distribution | Versions 1.6.1 cohérentes ; identité du moniteur ajoutée et modèle systemd sans couplage. |

L'identité publique contient uniquement le workspace configuré, canonique au
lancement CLI. Elle reste disponible sans contrôleur ou superviseur. Les
variables, ports, autorisations métier, schémas et mécanismes STATS ne sont
pas modifiés. Le moniteur conserve son propre fichier monitor.env et sa
politique Restart=on-failure, sans activation au login ni dépendance au
contrôleur ou au superviseur.

## 4. Commandes

Validations exécutées et réussies :

- `TMPDIR=<dossier local> node --test --test-concurrency=1 tests/controller-service-distribution.test.mjs tests/monitor-service-start.test.mjs tests/web-monitor.test.mjs` : code 0, 36 tests ciblés réussis.
- `TMPDIR=<dossier local> node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : code 0, 276 réussites et un ignoré, durée native 59 260,768007 ms.
- `TMPDIR=<dossier local> PYTHONPYCACHEPREFIX=<cache local> python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 59 réussites, durée native 5,125 s.
- `TMPDIR=<dossier local> node tests/web-monitor-browser.mjs` : code 0, Chromium et Firefox headless, chacun vingt-deux groupes vérifiés.
- `systemd-analyze --user --man=no verify <modèle du moniteur>` : code 0, contrôle statique sans activation d'unité.
- `node --check <fichier.mjs>` et `py_compile.compile(..., doraise=True)` : 30 fichiers concernés, code 0.
- `openspec validate --all --strict --no-interactive` : code 0 avant archivage, 12/12 ; {{POST_VALIDATE}} après archivage.
- `openspec archive start-monitor-with-cab --yes --json` : {{ARCHIVE_PROOF}}.

Les runtimes utilisés sont `/home/devops/node/current/bin/node`,
`/home/devops/python/current/bin/python3`, `/usr/bin/systemd-analyze` et
`/home/devops/.local/npm/bin/openspec`. Lint, typage et construction tiers :
**non pertinents**, aucune chaîne correspondante n'est configurée pour ces
scripts. ShellCheck : **non pertinent**, aucun script shell modifié.
Activation et redémarrage par un gestionnaire systemd utilisateur réel :
**non exécutés**, hors périmètre des profils actifs ; seuls le modèle statique
et le paquet isolé sont qualifiés. Le fonctionnement d'un déploiement réel
n'est pas présenté comme exécuté.

Aucun échec de validation n'a été rencontré dans cette évolution. Les
modifications du test qui interdisait tout démarrage du moniteur correspondent
au nouveau contrat validé ; les protections d'indépendance et d'absence
d'activation au login sont conservées et renforcées. Les tests existants
n'ont pas été désactivés et les délais n'ont pas été augmentés.

## 5. Accès web

Aucune recherche ou consultation web externe pour cette évolution. Les tests
HTTP/JSON/SSE, WebDriver et BiDi utilisent les seules fixtures loopback. Aucun
endpoint de production n'a été sondé ; les captures montrent des données
simulées. Volumes et durées par appel : **N/A**, aucune collecte exhaustive.

## 6. Synthèse globale

La livraison source 1.6.1 intègre le service web dans /cab start et conserve
son indépendance. Le démarrage explicite et la preuve d'identité précèdent
le contrôleur ; un monitoring indisponible est signalé séparément. /cab stop
et le reset conservent sa configuration, son jeu installé et ses connexions.
Une instance active divergente ou un port occupé n'est jamais remplacé ou
interrompu implicitement. Le lancement manuel reste possible.

Qualification : **335 tests réussis, un scénario réel ignoré**, trente fichiers
syntaxiquement valides, vingt-deux modules en 1.6.1, modèle systemd vérifié et
deux navigateurs qualifiés. Cohérence et archivage : {{POST_VALIDATE}} ;
{{ARCHIVE_PROOF}}. Aucun blocage connu ne subsiste dans la préparation source.
L'utilisation effective requiert le chargement du jeu 1.6.1 et l'invocation
explicite de /cab start ; aucun service actif n'a été modifié dans cette session.
