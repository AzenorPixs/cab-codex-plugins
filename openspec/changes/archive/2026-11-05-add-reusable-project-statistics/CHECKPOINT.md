# Change finalisé — clôture SCM CAB 2.3.1

Le change est archivé, ses 13 tâches sont validées et ses 11 exigences sont
synchronisées. Aucun réarchivage ni nouvelle tâche. La capacité a été publiée
sur GitHub en 2.3.0, commit af940d26 et branche réconciliée d2dd0b33.
Le périmètre intégral CAB est conservé. Forgejo était indisponible ; GitLab
non configuré. Aucune activation CABU ou de runtime n’est réalisée ici.

La finalisation 2.3.1 aligne tous les composants, paquets et commandes ; le
workflow DIU créera le nouveau tag v2.3.1. Qualification finale : 185 tests
Python, 1 284 tests Node réussis, 31 ignorés, Chromium/Firefox réussis,
24 fichiers Python syntaxiquement valides et deux commandes OpenSpec strictes
réussies sur 21 éléments chacune. Voir QUALIFICATION.md.

Le même rapport individuel conserve les trois relevés, ses six sections et
les preuves de clôture. Le bilan de blocage résolu est absent et aucun lien
courant ne pointe vers lui. Le DELTA global a échoué sur le contrat SGS
divergent ; le couple est strictement préservé, sans transaction en attente.
Cette limite ne bloque pas la clôture SCM. Une régénération manuelle SGS reste
à mandater séparément. La livraison autorisée utilise exclusivement
`sudo -n /usr/local/bin/diu projects cicd cab 2.3.1` ; son résultat est relevé
dans la restitution finale et le journal local output/sgs-finalization-2.3.1.
Aucun effet Git parallèle, amendement de tag existant ou suppression d’archive.

## Historique conservé

Les états de reprise ci-dessous sont des relevés antérieurs et ne décrivent
pas des tâches encore à effectuer.

---

# Clôture locale vérifiée — CAB2.3.0

Archivage normal réussi, six sections du même rapport vérifiées et contribution
ajoutée une fois au global :177archives,génération7. VERIFY --sources réussi,
sans transaction en attente. Le bilan de blocage résolu est supprimé après ces
contrôles ; ses références historiques ne sont plus des liens courants.
Les tests finaux et la cohérence documentaire sont prouvés dans QUALIFICATION.md.
Seule la livraison DIU2.3.0 reste à exécuter ; aucune activation autorisée ici.
Les états de reprise ci-dessous sont historiques.

---

# État courant — 5 novembre 2026, CAB2.3.0

Les autorisations de correction sont acquises et les écarts résolus. La base
publiée2.2.40 est synchronisée.185tests Python,1284Node,10contrôles ciblés,
Chromium/Firefox et OpenSpec strict21/21 réussis. QUERY et les identités libres
sont qualifiés. REBUILD176archives, génération6, SGS1.19.
Suite autorisée : archiver ce seul change par OpenSpec normal, amender le même
rapport, appliquer DELTA vers177archives, vérifier les sources puis livrer DIU.
Les anciennes consignes de reprise ci-dessous sont historiques et ne changent
pas cet état courant. Voir QUALIFICATION.md pour les preuves finales.

---

# Point courant — CAB 2.3.0, attente de validation de périmètre

## Dernier état vérifié

- Moteur SGS :43tests ciblés réussis. L’option de mode de publication est
  qualifiée et le registre initial invalide peut être reconstruit.
- Global CAB :175archives, génération4, VERIFY --sources réussi, sans journal
  en attente ; rapport et registre en0775.
- Rapport individuel réel créé par CHANGE en état blocked : six sections,
  tableaux riches, historique structuré et136commandes natives observées,
  dont126sorties0 et10sorties non nulles. Source : SESSION_OBSERVATION.json.
  Le change ouvert reste exclu du NCA ; le stock actuel du code a seul été amendé.
- Python global2.3.0 :175tests,174réussis,1erreur préexistante ; Node global :
  1287cas,1245réussis,11échoués,31ignorés. Trois échecs de fixtures d’artefacts
  ont ensuite été corrigés et repassés3/3 sans affaiblir la garde de production.
- Restent huit échecs Node et un écart de test Python, classés dans BLOCKERS.md.
  Les ajustements hors périmètre ont été proposés ; leur autorisation n’est pas
  acquise. Aucun travail dépendant ni livraison ne doit être lancé avant décision.
- sudo autorise bien la commande exacte `/usr/local/bin/diu projects cicd cab 2.3.0`.
  Elle n’a pas été exécutée : les prérequis de validation/archivage restent requis.
- Aucun commit, tag, push, archivage ou CABU effectué. Les ressources de cette
  session ont été libérées ; le fichier verrou SGS persistant n’est pas supprimé.

## Reprise attendue

Lire QUALIFICATION.md, BLOCKERS.md, STATISTICS.md et les tâches du change.
Ne pas refaire les43tests ou la reconstruction sans évolution qui l’exige.
Décider l’extension aux corrections préexistantes : ancre HMAC rejetée dès
prepare, racines fichiers au nettoyage des répertoires vides, fixtures V2 des
permissions, assertions pid/stateDirectory du moniteur et preuve de migration
historique à distinguer de la validation courante. Ne pas réécrire les archives.
Après corrections autorisées, relancer les contrôles affectés puis qualifier
l’état final, archiver le seul change SGS, amender son même rapport avec CHANGE,
appliquer son DELTA une seule fois et terminer la livraison SCM.

Les temporaires propres à cette session `.STATISTICS.session.json` et
`.STATISTICS.review.json` restent disponibles pour la reprise. Les données
utiles de session/revue sont aussi dans les rapports/registres ; les nettoyer
après finalisation vérifiée, sans effacer le verrou ou un journal nécessaire.

---

# Reprise — 5 novembre 2026, cible CAB 2.3.0

Session reprise ; les autorisations et le périmètre restent acquis. Les
constantes courantes, manifests, commandes, unités et attentes de version sont
alignés sur2.3.0. Les points de pause ci-dessous restent un historique daté.
Les modes de publication sont corrigés par conservation des modes existants et
option `--file-mode`, avec0775 explicite pour CAB. Validation finale en cours.

# Point de reprise — statistiques réutilisables CAB

## État

PAUSE — 5 novembre 2026, 16 h 45 Europe/Paris. Session SCM directe.
Aucun pilotage, CABU, commit, tag ou déploiement exécuté. Le change reste ouvert ;
aucun archivage effectué. Les tâches restent à rapprocher des preuves ci-dessous
avant leur coche. Ne pas présenter cette session comme terminée.

## Périmètre acquis

- Script réutilisable et intégration dans CAB : skill `sgs`, plugin CAB et commande
  `/SGS` en MAJUSCULES. Prompt commun exclusivement dans le projet prompts.
- SGS manuel : REBUILD intégral, ancien global supprimé sans exploiter son contenu.
- Appel d’une session de codage : CHANGE pour un rapport archivé ou arrêté pour
  dépendance ; DELTA pour le global existant, sinon aucune création ni opération.
  Aucun changement de contrat ne déclenche une reconstruction automatique.
- Rapports au moins équivalents aux références Pixs : agents complets, six sections,
  tableaux détaillés, rôles, outils et statuts, fichiers, commandes, web, mesures,
  sondes, notes et historique. Quotas exclus du global, conservables uniquement
  dans les détails individuels autorisés. Pas de télémétrie inventée.
- Import optionnel d’un export public CAB explicitement rattaché et dédupliqué,
  sans lecture privée ni accès réseau implicite.
- Les autorisations de périmètre restent acquises à la reprise.

## Réalisations locales

- `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py` : point d’entrée.
- `plugins/cab-approval-bridge/scripts/cab_sgs.py` : moteur en bibliothèque standard.
  Modes VERSION, INSPECT, CHANGE, REBUILD, DELTA, VERIFY, RECOVER.
- `plugins/cab-approval-bridge/skills/sgs/` : skill, métadonnées et schéma.
- `.codex/commands/SGS.md`, manifeste du plugin CAB, distribution de commandes
  et updater (les deux modules Python doivent être distribués ensemble).
- `tests/test_sgs.py` : 40 tests, dont fixtures riches inspirées de Pixs,
  domaines disjoints, populations partagées, import natif, rapports individuels,
  delta sans autres lectures, idempotence, reprise et retour arrière.
- Version commune préparée 2.2.40 : constantes courantes, manifests, unités,
  commandes et attentes de version. Aucune archive historique modifiée.
- `PROJECT.md`, `TECHNICAL.md`, `BUILD.md`, `README.md`, `CHANGELOG.md`,
  `DEVELOPMENT_MAP.md`, `openspec/BATCH_CODES.md` amendés pour le périmètre.
- Sources broker préexistantes conservées. Copies distribuées server/journal
  régénérées depuis src conformément à BUILD, après constat de divergence.
- `/home/devops/datas/prompts/SGS.md` : version 1.18, routage vers le moteur,
  frontière manuel/delta, rapports de change et exigence d’équivalence Pixs.
- Points d’appel adaptés dans ACSP, CGP, CISM/CISMP, ISM/ISMP, RCAM/RCAMP,
  RSM/RSMP, SCM/SCMP. Ces fichiers sont dans le projet prompts, pas dans CAB.
- Skill de collecte `coding-session-statistics` : rendu routé vers CHANGE,
  sans modifier ses obligations de collecte ou les mandats distincts en pilotage.

## Couple global CAB publié localement

La dernière commande REBUILD a terminé avec code0 :
- NCA175 ; génération2 ; aucune transaction en attente.
- SHA-256 du rapport : b58e4011b48068389bad612737224294307716c2d42d306e4436f544130c32b0.
- `STATISTICS.md` et `STATISTICS_CONTRIBUTIONS.json` présents.
- REBUILD inclut une vérification finale du couple, du rendu, des sources et du code.
- `.STATISTICS.review.json` contient 60 revues liées aux empreintes des rapports,
  notamment les bilans finaux, campagnes partagées et véritables contradictions.
  Les revues utiles sont aussi dans le registre. Conserver ce temporaire pour la
  qualification restante, puis nettoyer uniquement les temporaires créés ici.
- Le change courant est ouvert et reste exclu du NCA ; son rapport individuel
  devra être produit au moment approprié par CHANGE, sans inventer un blocage
  pour justifier un état blocked lors d’une simple pause.

## Vérifications réellement observées

- Dernière suite Python complète : `python3 -B -m unittest discover -s tests -p
  'test_*.py'` : 173 tests, tous réussis, 13,211s.
- Dernière distribution : `node --test tests/controller-service-distribution.test.mjs` :
  33 tests, tous réussis, après synchronisation des copies broker et correction
  des attentes pour les trois commandes CAB/CABU/SGS.
- Les 40 tests SGS ciblés ont réussi avant la suite complète finale.
- Validation stricte du nouveau change OpenSpec réussie, y compris l’exigence
  d’équivalence des références Pixs. Refaire le contrôle final après documentation.
- Validation du skill sgs par quick_validate.py réussie avant les derniers
  amendements documentaires ; vérifier une dernière fois à la finalisation.
- Suite combinée updater/distribution antérieure : 125 cas, 123 réussis,
  2 échecs de distribution (copies broker et attente de deux commandes).
  Ces deux causes sont corrigées et les33cas de distribution repassés.
  Rejouer l’intégration updater sur l’état final avant livraison ; ne pas
  présenter l’ancienne suite combinée comme entièrement réussie.
- Examen des187rapports Pixs en lecture seule pour qualifier les formes ;
  aucune écriture ni régénération Pixs. Les données de Pixs ne sont pas des
  mesures de CAB. Les extracteurs conservateurs restent complétés par une
  revue sourcée lorsque la narration n’est pas reconnue.

## Livraison et limites

PROJECT_ID=cab, PROJECT_NAME=Codex Approval Bridge extraits localement avec filtre.
DIU n’est pas accessible via le PATH non privilégié ; cela ne prouve pas son
absence. Le contrôle `sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.2.40`
a réussi et autorise la commande précise. Aucune livraison DIU lancée.
Ne pas demander à nouveau l’autorisation SCM ; conserver les prérequis de tests,
archivage et rapports. Ne pas relancer un effet incertain ni lancer CABU implicitement.
Le dépôt contient de nombreuses modifications préexistantes ; préserver celles-ci.
La livraison SCM inclut tous les fichiers versionnés selon son contrat.

## Prochaines opérations à la reprise

1. Relire les fichiers ciblés et confirmer la fraîcheur des preuves, sans
   recommencer les travaux acquis ni déduire une reprise de pilotage.
2. Vérifier les modes de publication des fichiers (moteur0600 pour le couple,
   convention CAB0775 à examiner), les frontières des chemins/temporaires et
   la correspondance du schéma avec les tableaux riches.
3. Achever l’audit des extractions CAB, les contrôles syntaxiques explicites,
   les liens/UTF-8/LF et la revue documentaire ; relancer uniquement les tests
   affectés. Finaliser le contrôle d’intégration updater et OpenSpec global.
4. Mettre à jour les preuves et tâches, synchroniser le canon, archiver le seul
   change `add-reusable-project-statistics` s’il est éligible. Ne pas toucher
   au change actif préexistant `purge-change-state-after-opencode-cleanup`.
5. Produire son rapport individuel avec CHANGE, vérifier ses six sections,
   puis DELTA pour l’ajouter une seule fois au global existant.
6. Vérifier le couple, nettoyer les temporaires propres à cette session et
   finaliser la livraison SCM DIU après satisfaction de ses prérequis.
   Distinguer préparation locale, publication par destination et activation.


Contrôle final après nettoyage : VERIFY --sources réussi, NCA177, génération8,
aucune transaction en attente. QUERY a renvoyé1469tests pour cette seule archive,
avec statut queried et mutated=false. Le delta a remplacé son empreinte sans
modifier NCA.
