# Rapport d'archivage SCM — add-local-web-monitor

Projet : Codex Approval Bridge (`cab`). Livraison source : **1.5.0**.
Date : 20 octobre 2026, Europe/Paris. Agent d'exécution : Codex, session directe SCM.
Archive : `{{ARCHIVE}}`.

## 1. Statistiques générales et décisions

Je livre CAB Monitor, serveur indépendant sur loopback et port configurable
8790, une interface moderne et responsive, l'observation des briques et RUN,
les changes et leurs tâches cochées X/Y, une chronologie filtrée et la limite
effective des commandes du contrôleur. Les sources courantes et supports de
distribution sont alignés sur 1.5.0, avec cachebuster neuf.

| Validation finale | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, toutes les suites MJS en série | 247 | 0 | 1 | 248 |
| Python, découverte unittest | 59 | 0 | 0 | 59 |
| Total distinct | **306** | **0** | **1** | **307** |

Le scénario OpenCode réel, opt-in absent, reste ignoré et n'est pas compté
comme réussite. Les tentatives de qualification ne sont pas additionnées.
**28 fichiers** passent la syntaxe ; **20 modules sources** annoncent 1.5.0.
Les tests de distribution vérifient aussi manifeste, commande et unités.

Chromium 155.0.8059.79 et Firefox 153.5.0 passent chacun neuf groupes de
vérifications : rendu, limite effective, RUN/changes, passage de 3/14 à 4/14,
filtres, SSE, panne, reconnexion et mobile sans débordement. Les captures ont
été examinées. Ces vérifications navigateur sont distinctes des totaux Node.

OpenSpec : contrôle strict global **10/10** avant archivage. Résultat après
archivage et synchronisation : {{POST_VALIDATE}}. Archivage : {{ARCHIVE_PROOF}}.

Tokens, coût, cache, quota, TTMT, débit, durée exhaustive et répartition exacte
des outils : **N/A**, aucune télémétrie normalisée de pilotage collectée en SCM.
La compétence de statistiques pilotées n'a pas été invoquée. Aucun sous-agent,
agent OpenCode de production ou orchestrateur distinct n'a été lancé.

## 2. Types de messages et d'outils

Lectures ciblées, recherches rg, éditions locales, empreintes, contrôles de
syntaxe, tests Node/Python, navigateurs headless et CLI OpenSpec. Les échanges
HTTP utilisent des services loopback simulés et des profils isolés. Aucun
mandat de production, décision réelle, permission réelle ou appel LLM n'a été
créé. L'affichage utilise les événements structurés, sans transcript complet.

L'identité non secrète du projet a été extraite par le traitement filtré
prévu par AGENTS.md ; aucune autre variable de project.env n'a été exposée.
La rédaction suit les préférences explicites du projet ; aucun connecteur de
références stylistiques n'était disponible. Aucune publication de message.

Deux diagnostics Git initiaux avaient eu lieu avant chargement du prompt SCM,
le premier refusé pour propriété du dépôt et le second en exception limitée au
processus. Aucun diagnostic Git n'a suivi le chargement de cette règle. Aucun
commit, préparation de commit, branche, push ou configuration persistante.

## 3. Fichiers modifiés

{{FILE_INVENTORY}}

Le contrôle initial suit 62 fichiers existants par empreinte. Les trois modules
Python src ont reçu uniquement l'édition de version 1.4.0 vers 1.5.0 ; ils
n'avaient pas d'empreinte initiale dans ce relevé. Les contrôles UTF-8/LF portent
sur le périmètre suivi, sans prétendre inventorier des modifications externes
sur tout le disque. Les artefacts de tests sont dans `.monitor-work/` ; les
profils et workspaces de fixtures sont nettoyés par les tests.

| Document | Bilan et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte conservée ; aucune nouvelle règle d'agent. |
| PROJECT.md | Version, séparation des rôles, section 5.3.1 et vues d'architecture actualisées. |
| TECHNICAL.md | Section CAB Monitor : routes, variables, bornes, fraîcheur, couverture, avancement et qualification. |
| BUILD.md | Version, modules distribués, dépendance monitor-events et modèle de service indépendant. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes, OpenSpec et navigateurs utilisés. |
| README.md | Présentation, lancement manuel, port 8790 et limites de couverture. |
| CHANGELOG.md | Entrée 1.5.0 de préparation source ; historique 1.4.0 et antérieur conservé. |
| openspec/specs/ | Quatre capacités existantes synchronisées et nouvelle capacité local-web-monitor. |
| ORCHESTRATED_CODING.md | Seules références de version courante alignées ; protocole métier conservé. |

La marketplace reste inchangée : elle référence le plugin local sans numéro
propre. Les supports HTML/CSS sont rattachés à la release, sans version
artificielle. Aucun fichier de licence, secret ou configuration OpenCode n'a
été modifié.

## 4. Commandes

Validations exécutées et réussies :

- `TMPDIR=<dossier local> node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : code 0, 247 réussites et un ignoré, durée native 58 594,465943 ms.
- `TMPDIR=<dossier local> PYTHONPYCACHEPREFIX=<cache local> python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 59 réussites, durée native 5,370 s.
- `TMPDIR=<dossier local> node tests/web-monitor-browser.mjs` : code 0, Chromium et Firefox headless ; captures desktop 1440×1100 et mobile 390×844.
- `node --check <fichier.mjs>` et `py_compile.compile(..., doraise=True)` : 28 fichiers contrôlés, avec les runtimes explicites de DEVOPS.md.
- `openspec validate --all --strict --no-interactive` : code 0 avant archivage ; {{POST_VALIDATE}} après archivage.
- `openspec archive add-local-web-monitor --yes --json` : {{ARCHIVE_PROOF}}.

Les binaires utilisés sont `/home/devops/node/current/bin/node`,
`/home/devops/python/current/bin/python3` et
`/home/devops/.local/npm/bin/openspec`.
Lint, typage et construction tiers : **non pertinents**, aucun contrôle de ce
type n'est configuré pour ces scripts et ressources sans chaîne de build.
Installation et qualification sur RUN actifs : **non exécutées**, hors périmètre.

Échecs intermédiaires conservés dans le bilan : trois nouvelles assertions de
fixture ont d'abord divergé parce que le résumé synthétique avait changé sans
changer sa copie native ; les données ont été corrigées, puis les trois tests
ont réussi. Le pilote navigateur Chromium utilisait une expression simple pour
des actions composées ; le pilote a été corrigé avant qualification réussie.
Une exigence OpenSpec trop longue a été scindée et le strict est devenu vert.
Deux premières passes globales ont échoué chacune sur une attente de fixture,
sur des scénarios différents : démarrage contrôleur puis permission native.
Ces scénarios ont repassé individuellement sans modifier leurs délais ou
assertions, puis la passe globale finale a réussi. Ces échecs ne sont pas
comptés comme réussites ni effacés du bilan ; leur intermittence reste une
limite de reproductibilité de l'environnement de qualification.

## 5. Accès web

Aucune recherche ou consultation web externe pendant l'implémentation SCM.
Les échanges HTTP/JSON/SSE et WebDriver/BiDi visent uniquement des services
loopback de test. Les observations de production, historiques natifs, profils
installés et services utilisateur n'ont pas été sollicités. Volumes réseau et
durées par appel : **N/A**, aucune collecte exhaustive dédiée.

## 6. Synthèse globale

La livraison source CAB 1.5.0 fournit la supervision web indépendante, la
configuration effective du contrôleur et l'avancement documentaire des changes.
Les permissions once, décisions corrélées, gates, verrous, schémas et voies MCP
existants sont préservés. Le flux d'observation ne décide rien et ne rejoue
aucune opération. Aucun service n'est installé, activé ou démarré en production.

La qualification finale établit 306 tests réussis, un scénario réel ignoré,
deux navigateurs qualifiés et 28 fichiers syntaxiquement valides. La couverture
de chronologie est bornée : 500 événements côté contrôleur, 200 côté moniteur,
50 visibles après filtrage ; redémarrage et troncature restent explicites.
X/Y mesure uniquement les tâches cochées et ne valide pas le gate du RUN.

Archivage et cohérence finale : {{ARCHIVE_PROOF}} ; {{POST_VALIDATE}}.
Le démarrage opérationnel ultérieur exige les sources complètes 1.5.0 et une
configuration locale explicite. La mise en service reste hors de cette livraison.
