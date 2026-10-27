# Rapport d'archivage SCM — add-cabu-skill-plugin-command

Projet : Codex Approval Bridge (`cab`). Date : 27 octobre 2026, Europe/Paris.
Livraison source : **1.10.11**. Session directe SCM.
Archive : `2026-10-27-add-cabu-skill-plugin-command`.

## 1. Statistiques générales et décisions

La marketplace CAB distribue maintenant un plugin CABU autonome, doté du skill
`cabu`, en plus du plugin `cab-approval-bridge`. Le skill d'entrée et la
commande `/CABU` délèguent à l'unique procédure `/CAB update`; aucune logique
de maintenance n'est dupliquée. Les métadonnées et les briques actives source
sont alignées sur `1.10.11`, tandis que `1.10.10` reste reconnu comme version
antérieure qualifiée.

| Validation | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, toutes les suites MJS | 416 | 0 | 26 | 442 |
| Python, découverte unittest | 73 | 0 | 0 | 73 |
| Total distinct | **489** | **0** | **26** | **515** |

Vingt-six tests sont ignorés selon leurs conditions internes ; leurs causes
détaillées ne sont pas agrégées ici. Le contrôle Chromium et Firefox headless a
réussi. La syntaxe Python a été compilée dans un cache temporaire. OpenSpec
strict : **15/15** avant archivage et **14/14** après synchronisation ; archive
créée avec 2 exigences ajoutées, 0 modifiée, supprimée ou renommée.

Modèle exact, tokens, coût, cache, quotas, durée exhaustive et comptage
exhaustif des messages ou outils : **N/A**, aucune télémétrie de pilotage
normalisée collectée en session SCM directe. Aucun sous-agent ni orchestrateur
de codage n'a été utilisé.

## 2. Types de messages et d'outils

Lectures ciblées, recherches `rg`, éditions locales, CLI OpenSpec, vérifications
JSON/manifestes, tests Node et Python, compilation syntaxique Python et
navigateurs headless. La session n'a pas utilisé CAB, OpenCode, de service
actif ou de session de pilotage. La définition du plugin a été comparée au
format local de plugin Codex ; aucun plugin n'a été installé dans un profil.

La politique de nommage des Agent Skills impose un identifiant machine en
minuscules : le skill est nommé `cabu`, présenté comme CABU, et sa description
reconnaît l'invocation demandée `$CABU`. La vérification du chargement réel du
plugin dans l'interface utilisateur n'a pas été exécutée.

## 3. Fichiers modifiés

Les métadonnées, sources et supports de version courante ont été alignés sur
1.10.11 dans **59 fichiers** contenant cette version. Les principales briques
touchées comprennent `src/`, le broker, les scripts, les unités systemd, le
moniteur Web et les skills CAB existants. Les tests de distribution, de
maintenance, de supervision, de navigateur et de broker ont été adaptés ; les
occurrences historiques de 1.10.10 ont été conservées.

Nouveaux éléments du plugin CABU :

- `plugins/cabu/.codex-plugin/plugin.json`
- `plugins/cabu/skills/cabu/SKILL.md`

Marketplace et points d'entrée : `.agents/plugins/marketplace.json` et
`.codex/commands/{CAB,CABU,cab}.md`. Cadrages mis à jour : `PROJECT.md`,
`TECHNICAL.md`, `BUILD.md`, `README.md` et `CHANGELOG.md`. La spécification
`codex-integration-distribution` a reçu deux exigences ajoutées. Les artefacts
de proposition, conception, tâches et delta OpenSpec sont conservés dans
l'archive ; ce rapport en constitue le sixième artefact.

## 4. Commandes

Validations exécutées et réussies :

- `node --test tests/controller-service-distribution.test.mjs` : code 0, 28 tests.
- `node --test tests/active-component-update.test.mjs` : code 0, 34 tests.
- `node --test tests/*.test.mjs` : code 0, 416 réussites, 26 ignorés, 442 tests.
- `/home/devops/python/current/bin/python3 -m unittest discover -s tests` : code 0, 73 tests.
- `PYTHONPYCACHEPREFIX=/tmp/cab-pycache-20261027 /home/devops/python/current/bin/python3 -m py_compile ...` : code 0 pour les modules source, copies broker et tests Python visés.
- `node tests/web-monitor-browser.mjs` : code 0 ; Chromium et Firefox headless réussis.
- `/home/devops/.local/npm/bin/openspec validate add-cabu-skill-plugin-command --strict` : code 0 avant archivage.
- `/home/devops/.local/npm/bin/openspec validate --all --strict` : code 0 avant (15/15) et après (14/14) archivage.
- `/home/devops/.local/npm/bin/openspec archive add-cabu-skill-plugin-command --yes --json` : code 0 ; 2 exigences ajoutées.

La commande de validation officielle du manifeste ne fait pas partie de la CLI
`codex plugin` observée ; la structure JSON, la marketplace et le manifeste
ont été exercés par les tests locaux. L'installation et l'invocation du plugin
dans un profil Codex réel sont **non exécutées**. ShellCheck, lint, typage et
construction tierce : **non pertinents**, aucun outil correspondant n'est
configuré pour ce périmètre.

## 5. Accès web

Consultation de la documentation officielle OpenAI sur le format des plugins
Codex et leur distribution par marketplace. Aucun service de production,
compte utilisateur ou API n'a été interrogé ; les tests utilisent des données
locales ou des fixtures loopback.

## 6. Synthèse globale

Le dépôt source fournit maintenant trois points de distribution cohérents : le
plugin CABU avec son skill `cabu`, la commande `/CABU` et le plugin CAB
`cab-approval-bridge`. Ces entrées renvoient à la procédure canonique `/CAB
update`. La release source est `1.10.11` ; les versions qualifiées antérieures
restent acceptées. OpenSpec est synchronisé, archivé et validé strictement.

Qualification : **489 tests réussis, 26 ignorés, 0 échec**, deux navigateurs
headless réussis et compilation syntaxique Python réussie. La disponibilité
effective de `$CABU` dépend de l'installation du plugin `cabu` dans Codex ; cette
installation n'a pas été réalisée dans cette session SCM.
