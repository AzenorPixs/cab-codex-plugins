# Statistiques — reset-cab-state-before-new-session

Session SCM autonome, projet `/home/devops/datas/cab`. Périmètre validé par le
développeur : purge de nouvelle session, protocole/skill/commande, version
0.86.5 et archivage de ce seul change. Aucun agent OpenCode n'a réalisé le
codage. Ce rapport utilise les résultats de commandes observés et les contrôles
de fichiers ; l'export natif de télémétrie Codex n'est pas disponible.

Un appel réussi ne démontre pas une approbation CAB : SCM est autonome et
n'utilise pas de mandats CAB. Refus de permission, échec de test et erreur
technique sont distingués. Les pourcentages portent seulement sur les jeux
recensés ci-dessous, jamais sur un total d'outils non accessible.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex, famille GPT-6 indiquée par l'environnement | N/A — version exacte non exposée | OpenAI | N/A — télémétrie non exposée | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent distinct : SCM autonome | N/A | N/A | N/A | N/A | N/A | N/A |

Temps de service, dénominateur et chevauchements : N/A, sans télémétrie native.
Sondes de début, périodiques et de fin : N/A — aucun mécanisme de sonde de la
session Codex n'est exposé ; sondes périodiques non activées. Aucune sonde
Qwen n'est attribuée au codage, et aucune mesure n'est reconstituée après coup.

## 1. Statistiques générales et décisions

- Résultat : purge livrée dans le plugin ; six briques alignées sur 0.86.5.
- Validation autonome explicite reçue, incluant l'exception permettant ce
  change supplémentaire sans toucher les trois changes déjà ouverts.
- Archivage : 1/1 réussi (100,0 %), sans commit, push ou publication.
- Compactions, tokens, cache, coût, nombre global de messages/outils,
  approbations CAB et temps de génération : N/A — export natif indisponible.
- Le premier lancement des 10 tests ciblés a produit 9 réussites (90,0 %) et
  1 erreur (10,0 %) : fermeture de stdin avant la réponse MCP dans le client
  de test. Le client a été corrigé pour attendre chaque réponse avec délai
  borné avant fermeture ; les 10 tests passent ensuite (100,0 %).
- Le validateur du skill a d'abord échoué dans Python projet faute de PyYAML.
  Le même validateur réussit avec Python système déjà disponible. Aucune
  dépendance n'a été installée.

| Suite finale | Tests | Part des suites complètes | Réussis |
|---|---:|---:|---:|
| Python complète | 37 | 61,7 % | 37 (100,0 %) |
| Node complète | 23 | 38,3 % | 23 (100,0 %) |
| Total complet | 60 | 100,0 % | 60 (100,0 %) |

Les 10 tests ciblés sont déjà inclus dans les 37 tests Python : ils ne sont
pas ajoutés au total de 60. Durées observées : Python 3,513 s, Node 2,426 s.
Elles représentent les suites de tests, pas le temps de service du modèle.

## 2. Types de messages et d'outils

| Mesure native | Nombre | Part |
|---|---|---|
| Messages par rôle | N/A — export non exposé | N/A |
| Parties et terminaisons | N/A — export non exposé | N/A |
| Outils par type et décisions | N/A — export non exposé | N/A |
| Mandats CAB du codage | Non applicable — SCM autonome | Non applicable |

Les commandes de validation recensées en section 4 ne constituent pas un
compte exhaustif des outils de la conversation. Deux fichiers de purge/tests
avaient été préparés avant la demande SCM ; ils ont été relus, finalisés et
validés dans ce périmètre, sans attribuer une preuve rétroactive à leur création.
La préparation initiale d'un pilotage OpenCode a été abandonnée après correction
du développeur : contrôleur arrêté, aucun codage délégué et aucun prévol réel
OpenCode annoncé réussi.
Cette préparation a configuré le contexte CAB dans
`/home/ade/.config/cab-approval-bridge/controller.env`, sans secret ; cette
écriture de profil est distincte des sources de livraison et le service reste
arrêté. Aucun cache de plugin installé n'a été édité.

## 3. Fichiers modifiés

27 chemins de livraison connus, rapport compris. Les effectifs ci-dessous
sont des fichiers, pas des tentatives d'écriture : les nombres d'écritures
approuvées, refusées et en erreur sont N/A faute de registre natif exportable.

| Chemins absolus | Nombre | Part |
|---|---:|---:|
| /home/devops/datas/cab/AGENTS.md ; /home/devops/datas/cab/PROJECT.md ; /home/devops/datas/cab/TECHNICAL.md ; /home/devops/datas/cab/BUILD.md ; /home/devops/datas/cab/README.md ; /home/devops/datas/cab/CHANGELOG.md | 6 | 22,2 % |
| /home/devops/datas/cab/pyproject.toml ; /home/devops/datas/cab/.codex/commands/cab.md ; /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | 3 | 11,1 % |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py ; /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs ; /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs ; /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py | 4 | 14,8 % |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md ; /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md | 2 | 7,4 % |
| /home/devops/datas/cab/tests/test_session_reset.py ; /home/devops/datas/cab/tests/test_crash_recovery.py ; /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | 3 | 11,1 % |
| /home/devops/datas/cab/openspec/specs/approval-persistence/spec.md ; /home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md | 2 | 7,4 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-05-reset-cab-state-before-new-session/.openspec.yaml ; /home/devops/datas/cab/openspec/changes/archive/2026-10-05-reset-cab-state-before-new-session/proposal.md ; /home/devops/datas/cab/openspec/changes/archive/2026-10-05-reset-cab-state-before-new-session/design.md ; /home/devops/datas/cab/openspec/changes/archive/2026-10-05-reset-cab-state-before-new-session/tasks.md ; /home/devops/datas/cab/openspec/changes/archive/2026-10-05-reset-cab-state-before-new-session/specs/approval-persistence/spec.md ; /home/devops/datas/cab/openspec/changes/archive/2026-10-05-reset-cab-state-before-new-session/specs/codex-integration-distribution/spec.md | 6 | 22,2 % |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-05-reset-cab-state-before-new-session/STATISTIQUES.md | 1 | 3,7 % |
| Total livraison | 27 | 100,0 % |

L'archive conserve les empreintes des 6/6 artefacts (100,0 %). Seules 2/7
spécifications de référence ont changé (28,6 %) ; les 5 autres restent
identiques (71,4 %). Les 15/15 fichiers des trois changes antérieurs restent
identiques après l'archivage (100,0 %). La synchronisation ajoute 5 exigences,
en modifie 2, n'en supprime aucune.

Nettoyage runtime autorisé séparément : 13 entrées supprimées dans les espaces
CAB du profil OpenCode et de Pixs, dont 4 conflits Syncthing (30,8 % des
entrées), sans lecture de contenu ni sauvegarde. Les verrous sont vidés,
pas réutilisés comme preuve. La répétition par l'outil final réussit avec
zéro entrée résiduelle. Ce nettoyage n'est pas mélangé aux 27 fichiers de
livraison. Les artefacts temporaires de validation ont été nettoyés.

## 4. Commandes

Jeu recensé : création du change, cinq validations OpenSpec explicites,
archivage, suites de tests, syntaxe, validateur du skill et exécution finale
de l'outil de purge. Les commandes exploratoires et les éditions par script
ne sont pas comptées : leur total global est N/A.

| Famille | Appels | Part | Réussis | Refus | Échecs |
|---|---:|---:|---:|---:|---:|
| OpenSpec : création, strict et archivage | 7 | 38,9 % | 7 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Tests Python | 3 | 16,7 % | 2 (66,7 %) | 0 (0,0 %) | 1 (33,3 %) |
| Tests Node | 1 | 5,6 % | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Compilation Python | 1 | 5,6 % | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Syntaxe Node | 3 | 16,7 % | 3 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Validateur du skill | 2 | 11,1 % | 1 (50,0 %) | 0 (0,0 %) | 1 (50,0 %) |
| Purge finale exécutée | 1 | 5,6 % | 1 (100,0 %) | 0 (0,0 %) | 0 (0,0 %) |
| Total recensé | 18 | 100,0 % | 16 (88,9 %) | 0 (0,0 %) | 2 (11,1 %) |

Les deux échecs sont explicités en section 1. Aucune commande refusée dans
ce jeu (0/18, 0,0 %) ; aucune commande SQL, Docker ou Git exécutée.
Les libellés suivants sont limités à 100 caractères ; les tâches de l'archive
conservent les mécanismes et résultats des validations :

- `openspec new change reset-cab-state-before-new-session` : 1.
- `openspec validate reset-cab-state-before-new-session --strict` : 3.
- `openspec validate --specs --strict` : 2, dont 7/7 après synchronisation.
- `openspec archive reset-cab-state-before-new-session --yes` : 1.
- `python3 -B -m unittest discover -s tests -p test_session_reset.py -v` : 2.
- `python3 -B -m unittest discover -s tests -p 'test_*.py'` : 1.
- `node --test [les trois suites CAB]` : 1, arguments exacts observés dans la session.
- `python3 -m py_compile [les quatre fichiers Python modifiés]` : 1.
- `node --check [un fichier]` : 3.
- `quick_validate.py plugins/cab-approval-bridge/skills/approval-bridge` : 2.
- `cgpt-approval-bridge-reset.py --confirm-new-session [les trois espaces CAB résolus]` : 1.

Les exécutables des tests et d'OpenSpec utilisent les chemins absolus de
DEVOPS.md. Le validateur du skill utilise Python système lors de son second
appel. Aucun argument de secret n'est passé aux commandes.

## 5. Accès web

Une consultation HTTPS des quotas Mode 1 a été effectuée pendant la
préparation initiale : `https://opencode.ai/zen/go/v1/usage`, 1/1 réussie
(100,0 %), zéro refus et zéro erreur (0,0 %). Elle n'est pas une sonde du
modèle ayant codé et ne remplace pas le quota Codex. La clé reste dans le
processus sécurisé, hors modèle, sorties et sources.

Aucune URL refusée dans ce jeu. Sous-requêtes, autres accès du compte et
coût : N/A — non mesurés. Aucun téléchargement de dépendance, accès forge ou
publication. Les HTTP/SSE locaux de préparation CAB ne sont pas du web externe.

## 6. Synthèse globale

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — début natif de la session non exporté, collecte non activée à cette borne |
| Fin — après archivage et contrôles | 2026-10-05T17:49:56+00:00 (19:49:56 Europe/Paris) |
| Durée globale, pauses et attentes incluses | N/A — borne initiale absente |

La rédaction/publication ultérieure de ce rapport est hors de cette borne de
fin. Une date de fichier ne remplace pas un début natif de session.

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage | 2026-10-05T17:49:56+00:00 | N/A — outil natif get_usage_limits non exposé | N/A |
| Différence après − avant | — | N/A — deux relevés natifs absents | — |

Les quotas sont partagés par le compte. Aucune consommation de cette session
n'est estimée à partir d'un autre quota, de tokens ou de mesures du fournisseur.

| Domaine de preuve | Résultat absolu | Part/taux |
|---|---|---|
| Fichiers de livraison connus | 27 | 100,0 % de ce jeu de fichiers |
| Commandes recensées | 18, dont 16 réussies et 2 échecs corrigés | 88,9 % réussies ; 11,1 % échouées ; 0,0 % refusées |
| Web de préparation recensé | 1 requête de quota réussie | 100,0 % ; 0,0 % refusée/échouée |
| Autres outils natifs | N/A — export non accessible | N/A |
| Global des outils | N/A — dénominateur exhaustif absent | N/A, total 100 % non calculable |

Les jeux de fichiers, commandes et web ne sont pas additionnés comme s'ils
avaient le même dénominateur. La ligne globale reste N/A pour ne pas fabriquer
un compte d'outils, d'approbations ou d'erreurs.

Matrice documentaire : AGENTS §7, PROJECT §3.5/5.5, TECHNICAL §4.4/16,
BUILD §3/6/7, README commande/distribution et CHANGELOG Unreleased mis à jour.
DEVOPS est inchangé : ses exécutables existants ont été utilisés, sans
dépendance ou infrastructure nouvelle. Deux spécifications sont synchronisées,
cinq préservées ; les trois autres changes ne sont pas archivés.

Les 60 tests finaux passent, les versions et le skill sont validés et ce
change est archivé. `/cab start/test` réel avec OpenCode est non exécuté :
OpenCode est fermé. Le CLI Codex ne propose pas de validation native de plugin ;
JSON, arborescence et tests de distribution ont été vérifiés. Les caches
installés ne sont pas modifiés. Aucun Git inspecté, commit, push, publication,
test PostgreSQL ou changement Syncthing n'est effectué. Aucun secret n'est
exposé ; seules les traces runtime explicitement autorisées ont été purgées.
