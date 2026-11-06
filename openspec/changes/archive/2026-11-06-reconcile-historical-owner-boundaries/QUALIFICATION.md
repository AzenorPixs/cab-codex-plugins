# Qualification SCM — CAB 2.3.3

Code non attribué ; convergence ACL ultérieure. Périmètre validé explicitement
par le développeur le 6 novembre 2026, incluant OpenSpec, réalisation, tests,
documentation, incrément, CI/CD puis CABU. La clôture source ne vaut pas activation.

## Résultats finaux observés

| Contrôle | Résultat final |
|---|---|
| Node, tous les tests réels du répertoire tests/ | 1370 cas : 1339 réussis, 0 échec, 31 ignorés |
| Python global | 193 exécutés, 193 réussis |
| OpenCode réel isolé | 1 exécuté, 1 réussi ; un des cas ignorés dans le mode générique |
| Total distinct exécuté | 1533 réussis, sans addition des campagnes répétées |
| Syntaxe des fichiers figés | 112 JavaScript et 27 Python, réussie |
| OpenSpec strict | 22 éléments réussis avant archivage,21 après archivage |

Les cas ignorés du mode générique ne sont pas présentés comme réussis. Le banc
natif utilise un serveur, fournisseur synthétique et profil isolés, sans copier
la configuration ou les credentials métier. Aucun test de source ne prouve
la reprise des RUN de production.

Sources locales non versionnées : output/scm-owner-remediation/release-node.tap,
release-python.log, release-native.tap, release-syntax.json, release-openspec.log
et release-source-freeze.json. Les139fichiers réels de plugins/, src/ et tests/
sont vérifiés identiques après campagnes ; le checkout historique imbriqué
n’est pas une source de cette qualification. Empreinte du dictionnaire trié
chemin→SHA256 : d7d25bd797f878b693511646b20e762b6dfde4c7491856840e0a835252c1201a.

Les campagnes antérieures restent conservées. La première a révélé une
comparaison NOT_ADMITTED oubliant le nouveau champ de preuve, corrigée ; les
attentes de versions échappées et le budget des commandes ont été réalignés
sans assouplir les gardes. Une campagne ultérieure a révélé une date
observée volatile au restart : elle est désormais durable/authentifiée et
distincte de l’événement de reboot. Le digest générique reste compatible ;
les nouvelles preuves lient explicitement l’époque qu’elles utilisent.
Le test de reconstruction après effet vérifie le même digest/opération/génération
et la provenance qualified-receipt, sans exiger un JSON privé de cette provenance.
Aucun ancien code1 n’est transformé en code0 dans les journaux.

## Couverture fonctionnelle

Retraite seule de PREPARED/REJECTED après extension et ancien SID révoqué ;
identités et décision historiques immuables ; no native/result/once/access.
Corrélation des mandats et séquence native request/get/poll jusqu’au REJECTED
exact observé, stop après décision et utilisateur suivant ; parents/dates,
absence de call environnemental, refus des enfants tardifs et des changements
entre lectures, transcript entier scellé. Les effets ultérieurs ne deviennent
pas sans effet par cette retraite.

Reboot du noyau postérieur au timeout exact, observation réelle persistée,
preuve antérieure conservée, refus du PID réutilisé d’avant boot, deux sondes
natives fraîches, port/processus/cgroup/netns/identité. Sondes du SID courant
sur ancienne source seulement par préparation exacte bornée ; commande non
préparée maintenue WAITING sans once. Reprises après crash, reçu durable,
absence d’exit historique fabriqué et préservation des protections étrangères.

## Preuves de coordination séparées

PA01 : ancien retrait réalisé, deux accès documentaires libérés sous reçus200.
Le faux positif resource-revision-stale venait de la projection agrégée d’un
parent : test_pa_native_linker.py attendu14051, effectif10700 dans la carte
publique détaillée. La demande neuve04 a exécuté21tests unitaires synthétiques
avec exit0, puis libéré son accès ; aucun sous-processus, aucune liaison réelle.
Ces21tests métier ne sont pas ajoutés aux1533tests CAB. Tâche4 métier reste
non validée globalement et bailLXC conservé. La documentation précise les
sources de révision, sans modifier la garde correcte.

C12 : les cinq demandes réelles ont été simulées en lecture seule avec la
preuve de séquence rejetée. Aucun retrait, probe ou nettoyage de production
n’a été exécuté par le correcteur. L’opération .03 reste protégée jusqu’aux
sondes et à la réconciliation propriétaires après activation. Le reboot
observé du3novembre21:35UTC est postérieur au call du2novembre07:07UTC ; ce
constat de diagnostic ne remplace pas les captures natives mandatées.
Le global statistique Pixs reste hors périmètre.

## Matrice de cohérence documentaire

| Source | État et justification |
|---|---|
| AGENTS.md | Inchangé : autorité, protections, périmètre et validations conservés |
| PROJECT.md | Capacité3.3 et limites historiques ajoutées |
| TECHNICAL.md | Frontières et référence normative distribuée ajoutées |
| BUILD.md | Distribution3.3 et compatibilité du marqueur privé documentées |
| DEVOPS.md | Version locale hvp1 conservée ; incluse/remplaçant le distant par demande explicite ; génération DIU relue après livraison |
| DEVELOPMENT_MAP.md | Entrée ciblée sans allocation de code ; état source séparé de livraison |
| openspec/BATCH_CODES.md | Même repère provisoire, aucune attribution/renumérotation |
| README.md | Synthèse et lien vers procédure propriétaires |
| CHANGELOG.md | Comportements3.3, aucun succès métier historique inventé |
| openspec/specs/ | Canons synchronisés aux garanties testées |
| Skill/plugin/commande | Routage court, nouvelle référence ciblée, digests de distribution actualisés ; budgets conservés |
| .gitignore | Ignore uniquement le DEVOPS local non versionné du checkout historique de qualification |

Le nom canonique vérifié est BLOCKERS.md (CISMP et CAB), aucun renommage
BLOCKED.md ni changement de prompt/template n’est effectué. L’ordre de clôture
reste gate/désarmement/libération sûre → nettoyageOC → effacementCAB, dans
TERMINÉ et BLOQUÉ pour dépendance avec son SID métier conservé.

## Livraison et activation

La source qualifiée est2.3.3, paquet2.3.3+codex.20261106051849. Le rapport SGS
est généré par le module CAB et son delta traité séparément, sans REBUILD.
Le cycle livré suit ensuite la commande root DIU projects cicd cab2.3.3,
puis vérification distante et CABU. Leurs reçus/versions actives et les reprises
propriétaires sont conservés dans les preuves opérationnelles de cette session,
sans réécrire le tag publié pour leur ajouter un succès anticipé.

Rapport individuel SGS3.3 créé via stdin et vérifié (six sections, UTF-8/LF,
mode0775, candidat absent). DELTA séparé exécuté : code1, couple/contrat
incompatible, SGS manuel requis. Les deux fichiers globaux sont conservés
avec empreintes identiques ; aucun REBUILD ni global Pixs exécuté. Cette
limite statistique globale ne bloque pas la livraison SCM.
