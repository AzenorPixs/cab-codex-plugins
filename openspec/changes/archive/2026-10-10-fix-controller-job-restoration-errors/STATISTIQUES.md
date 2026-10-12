# Rapport d'archivage — fix-controller-job-restoration-errors

Session SCM directe dans `/home/devops/datas/cab`. Le développeur a validé
le périmètre CGP-05 et son cycle OpenSpec, puis a demandé la version finale
`0.87.0`, un document dédié nommé en anglais et les renvois de tous les
AGENTS.md concernés. Sa dernière précision impose le caractère facultatif du
document, réservé aux projets nécessitant un pilotage par orchestrateur.

Aucun agent OpenCode de production, service CAB installé, sous-agent ni
compétence de statistiques SCMP n'a été lancé. Le présent rapport obligatoire
est produit après la preuve de l'archivage, avec les seules mesures disponibles.

### Agent de codage

| Agent | Version exacte | Fournisseur | Raisonnement mesuré | TTMT | Tokens/s | Coût |
|---|---|---|---|---|---|---|
| Codex, session directe | N/A — non exposée | OpenAI | N/A — aucune télémétrie SCMP | N/A | N/A | N/A |

### Agent orchestrateur distinct

Aucun : SCM est exécuté directement. Le protocole nouvellement documenté
ne déclenche pas de session pilotée, de sondes ou de collecte de quotas.
Tokens, cache, quota initial/final et statistiques exhaustives de messages :
N/A motivé par l'absence de collecte dédiée en SCM.

## 1. Statistiques générales et décisions

| Suites finales | Réussis | Échecs | Total | Part des tests | Réussite |
|---|---:|---:|---:|---:|---:|
| Node | 40 | 0 | 40 | 51,3 % | 100 % |
| Python | 38 | 0 | 38 | 48,7 % | 100 % |
| Total | 78 | 0 | 78 | 100 % | 100 % |

Les quatre tests nouveaux de restauration et le test nouveau de renvoi au
document dédié sont inclus dans ces totaux. Après la dernière précision sur
le caractère facultatif, les treize tests de distribution ont aussi réussi ;
cette exécution supplémentaire n'est pas additionnée au total de 78.

Avant correctif, les tests ciblés donnaient 2/4 succès : le JSON malformé et
l'erreur de lecture ne provoquaient pas de refus de démarrage. Après correctif,
4/4 réussissent avec contrôle de non-divulgation, absence d'interaction externe
et conservation des fichiers synthétiques.

La première suite de récupération a donné 6/7 avec `fetch failed` au lieu
de `validation-in-flight`. À commande identique et sans modification du
test, elle a ensuite réussi 7/7 ; la cause exacte du premier échec reste
non déterminée. La suite complète finale a également réussi ce scénario.

Une première suite Node complète a donné 36/39 : trois attentes de protocole
échouaient sur AGENTS.md, alors inchangé depuis le début de SCM.
Le développeur a demandé l'extraction du protocole dans le document dédié.
Les mêmes assertions vérifient désormais ce contenu ; un test supplémentaire
contrôle le renvoi local, les contrats techniques et le caractère facultatif.
La comparaison inverse confirme qu'aucune autre assertion existante n'a été
affaiblie.

Les contrôles syntaxiques ont réussi pour le contrôleur, le superviseur,
les deux fichiers de tests JavaScript modifiés et les trois fichiers Python
modifiés. JSON et UTF-8/LF ont été contrôlés. Le cache de compilation propre
à SCM a été créé dans CAB puis supprimé sans toucher un cache antérieur.

OpenSpec : delta ciblé strictement valide avant le code et avant l'archive.
Après synchronisation, 7/7 références valides en mode standard. Le strict
global retourne le code 1 : une référence valide et six refusées uniquement
sur 13 avertissements de longueur, zéro ERROR. Les tuples
spécification/niveau/chemin/message JSON sont identiques avant et après
archive. Le strict global n'est pas déclaré réussi.

Intervalle partiel observé : 10 octobre 2026, de 09:02:13 à 09:35:20
(Europe/Paris), soit 33 min 07 s. Il commence après la validation du périmètre
et se termine après l'archive, avant la rédaction de ce rapport. Il comprend
le travail et les attentes de décision ; il ne mesure ni toute la conversation,
ni le temps de service du modèle.

## 2. Types de messages et d'outils

Lectures et recherches ciblées, modifications locales, tests isolés, contrôles
syntaxiques, empreintes natives et CLI OpenSpec. Mandats CAB de production :
0, non applicables à cette session directe. Aucun appel de readiness réelle
ou de décision de production n'est présenté comme exécuté.

Répartition exhaustive des messages et appels, tokens, quotas et coûts :
N/A — absence de journal statistique normalisé et de collecte SCMP.
Les refus et erreurs attendus dans les fixtures restent des résultats de
tests, pas des décisions CAB de production.

Le développeur a autorisé les modifications documentaires hors de CAB :
sept autres racines sous /home/devops/datas, avec préconditions de contenu
et contrôles après écriture. Les commandes ont été examinées une par une.
Aucun fichier sensible, état technique de production ou contenu de .git
n'a été lu. Aucun accès fournisseur ni opération système d'installation.

## 3. Fichiers modifiés

### CAB : 17 fichiers existants modifiés

- `/home/devops/datas/cab/.codex/commands/cab.md`
- `/home/devops/datas/cab/AGENTS.md`
- `/home/devops/datas/cab/BUILD.md`
- `/home/devops/datas/cab/CHANGELOG.md`
- `/home/devops/datas/cab/README.md`
- `/home/devops/datas/cab/TECHNICAL.md`
- `/home/devops/datas/cab/openspec/changes/add-cab-archive-statistics/specs/codex-integration-distribution/spec.md`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `/home/devops/datas/cab/pyproject.toml`
- `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py`
- `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs`
- `/home/devops/datas/cab/tests/test_crash_recovery.py`
- `/home/devops/datas/cab/tests/test_session_reset.py`
- `/home/devops/datas/cab/openspec/specs/controller-transport/spec.md`
- `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md`

Le contrôleur ne change fonctionnellement que dans la restauration du job,
avec sa version. Le broker et le superviseur changent seulement de version.
Les attentes Python de version, les versions distribuées et le delta actif
historique de statistiques sont alignés sur 0.87.0. Les autres changes actifs
ne sont ni repris ni archivés.

### CAB : deux nouveaux fichiers hors archive

- `/home/devops/datas/cab/ORCHESTRATED_CODING.md`
- `/home/devops/datas/cab/tests/controller-job-restoration.test.mjs`

### Archive : six artefacts créés puis déplacés, plus ce rapport

- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-controller-job-restoration-errors/.openspec.yaml`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-controller-job-restoration-errors/design.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-controller-job-restoration-errors/proposal.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-controller-job-restoration-errors/specs/codex-integration-distribution/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-controller-job-restoration-errors/specs/controller-transport/spec.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-controller-job-restoration-errors/tasks.md`
- `/home/devops/datas/cab/openspec/changes/archive/2026-10-10-fix-controller-job-restoration-errors/STATISTIQUES.md`

Les chemins actifs déplacés ne sont pas comptés une seconde fois.

### Sept autres projets : 14 chemins

| `/home/devops/datas/diu` | AGENTS.md mis à jour ; ORCHESTRATED_CODING.md créé |
| `/home/devops/datas/pldap` | AGENTS.md mis à jour ; ORCHESTRATED_CODING.md créé |
| `/home/devops/datas/pfd` | AGENTS.md mis à jour ; ORCHESTRATED_CODING.md créé |
| `/home/devops/datas/pixs` | AGENTS.md mis à jour ; ORCHESTRATED_CODING.md créé |
| `/home/devops/datas/tools-codex` | AGENTS.md mis à jour ; ORCHESTRATED_CODING.md créé |
| `/home/devops/datas/template` | AGENTS.md mis à jour ; ORCHESTRATED_CODING.md créé |
| `/home/devops/datas/pixs-template` | AGENTS.md mis à jour ; ORCHESTRATED_CODING.md créé |

Chaque ligne représente exactement deux fichiers : AGENTS.md existant
modifié et ORCHESTRATED_CODING.md nouveau. Les huit AGENTS.md concernés,
CAB compris, référencent leur document local et précisent explicitement
qu'il est facultatif, uniquement présent pour les projets nécessitant un
pilotage. L'absence normale ne bloque pas un projet non piloté ou SCM direct.

Les règles générales et l'identité de chaque projet sont conservées.
Le protocole initial est transféré au document dédié et complété avec les
contrats techniques déjà validés. L'obligation générale de rapport
d'archivage reste dans AGENTS.md, y compris pour SCM sans compétence SCMP.

AutoIt et pixs-perl ne possèdent aucun AGENTS.md dans l'inventaire des
sources autorisées sous /home/devops/datas ; aucun fichier n'y a été créé.

Total final : **40 chemins = 24 fichiers existants modifiés (60 %) +
16 fichiers créés (40 %)**. CAB représente 26 chemins (65 %), les sept
autres projets 14 chemins (35 %). Aucun code fonctionnel n'a été supprimé.

PROJECT.md a reçu concurremment une section de diagramme d'architecture.
SCM ne l'a pas modifié : supprimer cette seule section en mémoire redonne
son empreinte initiale. Son contenu concurrent est conservé et exclu des
40 chemins attribués à cette intervention.

Le contrôle CAB couvre 50 fichiers existants sélectionnés. Les documents
des huit projets sont comparés intégralement aux transformations autorisées.
Il ne s'agit pas d'un inventaire Git ni d'une preuve exhaustive d'absence de
modifications concurrentes dans tous les fichiers de tous les dépôts.

## 4. Commandes

| Commande ou contrôle | Résultat observé |
|---|---|
| `node --test tests/controller-job-restoration.test.mjs` avant correctif | 2 succès et 2 échecs attendus reproduisant CGP-05 |
| Même commande après correctif | 4/4 réussis |
| `node --test tests/controller-session-recovery.test.mjs` | 6/7 puis 7/7, sans changement du test ; premier fetch failed non expliqué |
| `node --test tests/*.test.mjs` après extraction | 40/40 réussis |
| `node --test tests/controller-service-distribution.test.mjs` après précision facultative | 13/13 réussis, non additionnés |
| `python3 -B -m unittest discover -s tests -p 'test_*.py'` | 38/38 réussis |
| `node --check` par fichier JavaScript modifié | Réussi |
| `python3 -m py_compile` par fichier Python modifié | Réussi ; cache propre à SCM nettoyé |
| `openspec validate fix-controller-job-restoration-errors --strict` | Réussi avant code, puis avant archive |
| `openspec archive fix-controller-job-restoration-errors --json --yes` | Réussi une seule fois, specsUpdated true |
| `openspec validate --specs` | 7/7 valides avec avertissements |
| `openspec validate --specs --strict --json` avant/après | Code 1, mêmes 13 WARNING, zéro ERROR |
| Empreintes, versions, JSON, UTF-8/LF et renvois des huit projets | Réussis |
| Égalité des deltas archivés et références | Réussie après normalisation des espaces et exclusion des en-têtes de section du delta |

Les tests emploient TMPDIR=/home/devops/datas/cab et des services simulés.
Les binaires utilisés sont /home/devops/node/current/bin/node et
/home/devops/python/current/bin/python3. OpenSpec est appelé explicitement
via /home/devops/.local/npm/bin/openspec, avec Node DEVOPS ; sa télémétrie
est désactivée dans ces commandes.

Une capture initiale d'originaux a été tronquée et remplacée par des captures
séparées et des empreintes. Un patch documentaire au contexte PROJECT.md
incorrect a été refusé sans écriture, puis réémis sans ce fichier concurrent.
Deux contrôles natifs préliminaires ont été précisés pour distinguer les
en-têtes ADDED/MODIFIED du contenu normatif et conserver un espace final
préexistant dans la référence ; aucune réécriture hors périmètre n'en résulte.

Aucun drapeau de désactivation de validation OpenSpec, commande Git, installation,
activation ou redémarrage de service n'a été utilisé.

## 5. Accès web

Accès web externe de développement : 0. Les appels HTTP/SSE des tests
utilisent des composants simulés sur loopback. Aucun compte fournisseur,
secret, accès PostgreSQL, installation distante ou publication n'a été utilisé.
Les chemins et URL figurant dans la documentation sont des références,
pas des commandes exécutées sur les services réels.

## 6. Synthèse globale

CGP-05 est corrigé : seul ENOENT autorise un démarrage sans contrat.
Un JSON malformé ou une autre erreur de lecture interrompt le démarrage
avant HTTP et les interactions externes. Le diagnostic distingue les causes
sans contenu persistant ni chemin runtime. Les contrats valides et les
fichiers en erreur restent conservés.

La version finale demandée est 0.87.0, avec le plugin
0.87.0+codex.20261010070714. Aucun schéma persistant ni protocole MCP
n'est modifié. Les installations utilisateur ne sont pas mises à niveau.

ORCHESTRATED_CODING.md fournit le protocole et les détails techniques :
rôles, états, messages, interfaces HTTP/MCP/SSE, contrat durable, mandats
unitaires, permissions, preuves, prévol, erreurs de restauration, cadences,
compactage, récupération et clôture. Son nom est anglais, son contenu
français et son existence facultative selon le besoin de pilotage du projet.

Le change est archivé sous
2026-10-10-fix-controller-job-restoration-errors. L'archive native a déclaré
4 exigences ajoutées, 1 modifiée, 0 supprimée et 0 renommée. L'absence du
chemin actif, les tâches cochées et la synchronisation des deux références
sont vérifiées. Les trois autres changes restent actifs ; seul leur delta
de version de statistiques reçoit l'alignement demandé.

| Élément | Bilan documentaire et preuve |
|---|---|
| AGENTS.md | Huit fichiers mis à jour : protocole extrait, référence locale, caractère facultatif et règles générales conservées |
| ORCHESTRATED_CODING.md | Huit documents dédiés créés ; contexte local, contrats techniques et renvois vérifiés |
| PROJECT.md | Modification concurrente du diagramme conservée sans écriture SCM ; responsabilités toujours cohérentes |
| TECHNICAL.md | Section 7 précise le refus de restauration et l'absence de réparation ; version et rôle du document dédié précisés |
| BUILD.md | Section 7 alignée sur 0.87.0 ; construction et déploiement inchangés |
| DEVOPS.md | Inchangé : binaires observés conformes à l'inventaire, aucune dépendance ajoutée |
| README.md | Persistance, comportement de refus, version et référence facultative documentés |
| CHANGELOG.md | Entrées Unreleased pour le correctif, la version et l'extraction documentaire |
| OpenSpec | Delta ciblé strictement valide, deux références synchronisées, seul change ciblé archivé |

Réserves finales : strict global non réussi sur les 13 avertissements
historiques inchangés ; premier fetch failed de test non expliqué mais non
reproduit lors des validations finales. La validation complète du schéma
d'un contrat JSON syntaxiquement valide, la restauration des rappels et
celle de l'état du superviseur restent hors du correctif CGP-05.

Aucun déploiement réel, démarrage de session pilotée ou contrôle d'intégration
sur les services installés n'est annoncé. Le rapport est produit sans
compétence de statistiques SCMP. Sa présence, ses six sections, son encodage
et ses totaux doivent être contrôlés avant la restitution terminale.
