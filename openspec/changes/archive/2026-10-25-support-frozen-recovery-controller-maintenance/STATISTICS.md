# Rapport d'archivage SCM — support-frozen-recovery-controller-maintenance

Projet : Codex Approval Bridge (cab). Version source : 1.8.0.
Date : 25 octobre 2026, Europe/Paris. Session directe SCM.
Archive réelle : 2026-10-25-support-frozen-recovery-controller-maintenance.

## 1. Statistiques générales et décisions

Le lot L2 qualifie le profil frozen-recovery-controller depuis les processus
originaux 1.7.1, l'autorité privée BOOTSTRAP_HELD et son adoption avant le vrai
HELD du nouveau contrôleur. Il conserve OpenCode, broker, Web, identités et
préfixes, distingue les versions mixtes et exige un alignement ordinaire
distinct avant reprise métier. L'extension humaine couvre managed-release,
ses retours arrière et le diagnostic filtré approval-metadata, sans décision
sur les demandes inconnues ou legacy non routées.

| Qualification finale commune L1/L2 | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node | 363 | 0 | 1 | 364 |
| Python | 72 | 0 | 0 | 72 |
| Total distinct partagé | 435 | 0 | 1 | 436 |

435/435 cas exécutés sont réussis, soit 100 %. Un scénario opt-in OpenCode
produit est ignoré, soit 0,23 % des 436 cas. Les 28 scénarios bootstrap et
trois tests metadata font partie des 364 Node ; les répétitions ciblées ne
sont pas additionnées. Les deux rapports d'archive présentent les mêmes
résultats partagés, jamais des mesures exclusives à cumuler. Chromium et
Firefox sont qualifiés séparément. Syntaxe : 40 fichiers vérifiés.

RUN de pilotage SCM, télémétrie exhaustive, modèle exact mesuré, tokens,
coûts, débit, cache, quotas et durée complète de session : N/A, session
directe sans collecte normalisée. Le RUN C08 cité dans ACTIVATION.md est une
cible opérationnelle historique, pas un RUN exécuté par ce SCM. Aucune sonde
de quota ni compétence de statistiques pilotées n'est invoquée.

## 2. Types de messages et d'outils

Lectures ciblées, rg, empreintes, éditions sous CAB, syntaxe et tests Node/
Python, processus réels éphémères, adaptateur de services, HTTP/SSE de
fixture, navigateurs, CLI OpenSpec et comparaisons de distribution. Les
messages reçus du chat propriétaire fournissent des preuves historiques ;
ils ne déclenchent aucune décision ou mutation vivante dans ce SCM.

Le broker Python original est réellement conservé en M2 dans les fixtures ;
le contrôleur et le superviseur sont réellement arrêtés et relancés dans
ces seuls profils temporaires. M3 reconnecte le broker de fixture et relance
le moniteur de fixture ; les quatre versions actives 1.8.0 sont vérifiées.
Aucun service de production, OpenCode vivant ou projet Pixs n'est modifié.
Aucun sous-agent, commande Git ou message sortant vers un autre chat n'est
utilisé. Nombre exhaustif d'appels et de messages : N/A, collecte absente.

## 3. Fichiers et cohérence documentaire

Le lot ajoute maintenance-proof et approval-metadata, étend controller/update,
reconnaît les entrées CLI liées, qualifie le bootstrap et le diagnostic, et
aligne les annonces existantes, unités, manifeste, supports et copies broker
sur 1.8.0. Cachebuster du plugin : 1.8.0+codex.20261024231000. Aucun cache
installé n'est modifié. Les manifestes complets original/source et leurs
empreintes sont dans activation-manifests-final.json, sans installation.

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte de base conservée ; sécurité et autorisations respectées. |
| PROJECT.md | Mis à jour : référence 1.8.0, capacités, concurrence et rôles SCM. |
| TECHNICAL.md | Mis à jour : profil, preuves, phases, versions mixtes, releases et diagnostic. |
| BUILD.md | Mis à jour : distribution, chargement, limites des installations et tests isolés. |
| DEVOPS.md | Inchangé, empreinte conservée ; runtimes et navigateurs déclarés utilisés. |
| README.md | Mis à jour : comportement public et limites, lien vers component-update.md. |
| CHANGELOG.md | Une entrée 1.8.0 avec options et compatibilité ; historique conservé. |
| openspec/specs/ | Treize exigences ajoutées et dix-huit modifiées dans cinq capacités par l'archive L2. |
| ORCHESTRATED_CODING.md | Références concurrentes et bootstrap monitoring réconciliés, cohérence testée. |
| Références distribuées | Maintenance, versions, modes et diagnostic explicités ; aucun effet implicite. |

La liste détaillée issue des empreintes est dans source-final.json. Elle
compare la base SCM et les répertoires source concernés ; l'inventaire L1
antérieur et les nouveaux documents d'archive ne sont pas reconstruits en
compteurs prétendument exhaustifs. Les textes concernés sont vérifiés UTF-8/LF,
les trois copies broker sont identiques à src/ et les cinq gardes
retry/prévol/ASK/once sont identiques à l'original. Aucun code ne dépend de C08.

## 4. Commandes et résultats

- node --test tests/*.test.mjs : exécutée et réussie, 363 réussis, aucun
  échec, un ignoré sur 364, 124778,236659 ms ; node-release.txt.
- python3 -m unittest discover -s tests -p 'test_*.py' : exécutée et réussie,
  72/72, 4,428 s ; python-release.txt.
- node --check et python3 -m py_compile : exécutées et réussies, 40/40 ;
  source-final.json. Trois copies distribuées et cinq corps de garde comparés.
- node tests/web-monitor-browser.mjs : exécutée et réussie, Chromium et
  Firefox ; browser-tests.txt. La résolution CLI par lien, ajoutée ensuite
  sans modification visuelle, est couverte par les processus du bootstrap.
- openspec validate --all --strict --json : exécutée et réussie avant
  archivage, 15/15 dont deux changes ; openspec-release-before-archive.json.
- openspec archive support-frozen-recovery-controller-maintenance --yes --json :
  exécutée et réussie, code 0 ; archive-l2.json. Treize exigences ajoutées,
  dix-huit modifiées, aucune supprimée ou renommée. Aucun réarchivage.
- openspec validate --all --strict --json après les deux archives : exécutée
  et réussie, 13/13 canons ; openspec-release-after-archive.json.

Les preuves sont sous .cab-scm-1.8.0-work. Les runtimes absolus sont ceux de
DEVOPS.md ; TMPDIR et PYTHONPYCACHEPREFIX restent sous CAB. La qualification
fonctionnelle détaillée, les interruptions et les retours arrière sont dans
QUALIFICATION.md. Les erreurs intermédiaires sont conservées avec leurs
corrections, sans désactiver les contrôles. Lint/typage/construction distincte :
non disponibles, aucune chaîne configurée. ShellCheck : non pertinent.
Installation produit, reprise métier et services réels : non exécutés,
hors périmètre. Le test OpenCode produit optionnel n'est pas une preuve acquise.

## 5. Accès web

Aucune recherche web externe. Les essais HTTP/SSE et navigateurs utilisent des
fixtures loopback. Les observations produit en lecture seule et les preuves
natives transmises ne sont pas une autorisation d'opération. Aucun accès au
magasin privé ou aux secrets. Nombre et volume exhaustifs d'appels : N/A,
absence de collecte normalisée en SCM.

## 6. Synthèse globale

L2 est archivé avec ses exigences synchronisées et ce rapport individuel à
six sections. Le périmètre source 1.8.0 est qualifié : 435 tests réussis,
aucun échec, un ignoré, 40 fichiers syntaxiquement valides, trois copies broker
identiques et cinq gardes conservées. Ces mesures sont partagées avec L1.

Le bootstrap, les releases, le repli et le diagnostic sont génériques.
L'activation réelle reste distincte : demande legacy non routée à traiter par
une procédure validée, PAUSE des pairs, autorisations M2/réparation/M3 et
disposition du broker lancé depuis CAB/src sous uid 1002 face aux services
uid 1000. Les sources de son entrée sont maintenant 1.8.0, mais le processus
non relancé reste 1.7.1 ; la réutilisation intercomptes en lecture seule n'est
pas implémentée par le mode M3 qualifié. ACTIVATION.md expose les preuves,
la piste de refus par l'API existante 1.7.1 et les limites non déléguables.
Aucune décision legacy, aucun chargement vivant 1.8.0 ou métier repris n'est
déduit de la réussite des archives.
