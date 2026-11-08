# Qualification CAB 2.2.0 — 2 novembre 2026

État : implémentation source testée ; migration documentaire finale réalisée après les accords explicites
décrits dans PROMPTS_COMPATIBILITY.md. Le change est archivé et les spécifications sont synchronisées.
Les statistiques et publications SCM sont finalisées dans les étapes suivantes ;
aucun déploiement ne découle de cette qualification source.
L'endpoint vivant 127.0.0.1:8788 répond encore 2.1.81, workspace Pixs,
PID 2929448 à la vérification finale ; cette lecture ne certifie pas les
versions des autres briques.

## Résultats exécutés

| Vérification | Résultat |
|---|---|
| node --test tests/*.test.mjs | 850 tests : 819 réussis, 31 opt-in ignorés, aucun échec ; 63,85 s |
| Python 3.14 du projet, unittest discover -s tests -p test_*.py | 93 tests réussis ; 5,51 s |
| OpenCode 2.2.5 réel isolé, native-opencode-codemode.test.mjs | 1 campagne réussie, aucun skip ; 9,69 s |
| openspec validate --all --strict | 17 éléments valides, aucun échec |
| node --check | 88 modules vérifiés |
| Python du projet -m py_compile | 16 fichiers vérifiés |
| Texte | 246 fichiers UTF-8/LF contrôlés, aucun écart |

L'interpréteur Python du projet ne fournit pas pytest. Les tests sont des
unittest standard et ont réellement tourné sur cet interpréteur. Aucun paquet
n'a été ajouté pour les exécuter. Le validateur générique skill-creator refuse
le nom historique majuscule CAB ; ce nom canonique est explicitement imposé
par le projet et conservé. Les tests de distribution vérifient le frontmatter,
les noms CAB/CABU, les versions et les liens. Ce refus générique n'est pas
présenté comme une validation réussie.

## Campagne native et familles de panne

Le serveur, le provider synthétique, les sessions, le broker et les données
sont isolés et nettoyés par la fixture. Aucun fournisseur facturé, service
systemd vivant ou RUN Pixs n'a été sollicité pour ces essais.

| Famille | Preuves exécutées et limite |
|---|---|
| Décision et réponse perdue | Décision engagée dans le registre distincte d'une intention privée ; restauration HTTP et lookup natif du même reçu ; aucun nouveau once |
| Transport et observations | Curseur durable, déduplication, fenêtre dépassée et identité étrangère ; une panne de télémétrie ne décide pas d'un effet |
| Reprise compatible | Redémarrage réel du contrôleur pendant sleep background ; même PID OpenCode, même PID broker, même call natif et once acquitté |
| Concurrence | Deux RUN OpenCode réels ; le bail de test disjoint du second reste identique après bascule |
| Shell durable | Start non terminal, GET Shell.Info exact, sortie native, exit non nul conservé, timeout, divergence et restart ; aucun rattrapage inventé de l'ancien -03 |
| Garde native | Write/edit exacts ; arguments divergents bloqués avant once ; lecture seule, refus, erreur fournisseur et prévol divergent réconciliés |
| Récupération | Politique propriétaire et ressources, frontière périmée, reçu immuable, résultat post-crash non vérifié, refus de token client ; corruption d'un RUN isolée des pairs |
| Bail de test | Cleanup navigateur terminal indépendant du port Vite quarantiné ; effet associé ou ressource recouvrante toujours protégés |
| CABU | Aucun arrêt si conforme ; groupes modifiés seuls ; réponse prepare perdue, même reçu, annulation avant coupure, rollback et MCP pending sans nouvelle commande |

La readiness conservée garde son instance, version et checked_at. Son PID,
son démarrage système et sa connexion MCP sont revérifiés ; elle expire selon
sa date native. Un échec de cette vérification optionnelle ne transforme pas
un certificat métier valide en échec, mais exige une publication broker réelle.

## Mesures comparables

Les empreintes de l'ancien protocole local, du skill installé 2.1.81 et de
la commande installée concordent avec la base enregistrée dans
migration-coverage.json : 111 325, 77 696 et 109 328 octets respectivement.
La lecture status passe de la commande entière de 109 328 octets au routeur
et à sa seule procédure, 9 052 octets, soit environ 91,7 % de moins. L'entrée
skill+noyau+index représente 13 693 octets avant ses branches utiles ; elle
n'est pas comparée à une session fictivement dépourvue de ces branches.

Une fixture identique, avec commandes de syntaxe réelles et services simulés,
compare les paquets 2.1.81 installé et 2.2.0 source. Les résultats bruts sont
dans cabu-comparison.json ; la sentinelle de RUN/once/gate reste identique.

| Deuxième invocation conforme | CAB 2.1.81 | CAB 2.2.0 |
|---|---:|---:|
| Arrêts / démarrages d'unités | 3 / 3 | 0 / 0 |
| Déconnexion MCP | 1 | 0 |
| Indisponibilité simulée | 23 ms | 0 ms |
| Temps total de cet échantillon | 121 ms | 89 ms |

Ces durées simulées ne mesurent pas un déploiement réel. Le test natif isolé
mesure séparément 230 ms du signal d'arrêt du contrôleur jusqu'à l'adoption
observée, avec granularité de contrôle de 100 ms : c'est une borne de reprise
observée, pas une durée réseau exacte ni une garantie pour toutes les mises
à jour. La préparation complète reste hors coupure.

INPUT/OUTPUT/cache/coût proviennent des messages OpenCode, groupés par source
et modèle avec couverture. L'essai synthétique contrôlé prompt_tokens=12,
completion_tokens=5 et cache_read=4 est projeté nativement input=8, output=5,
cache.read=4 ; le collecteur conserve ces dimensions sans total inventé.
Le coût natif de la fixture est zéro. Économies réelles de facturation et
cache d'un fournisseur commercial : N/A, aucun comparatif facturé effectué.

## Matrice documentaire

| Source | Traitement et état |
|---|---|
| template/AGENTS.md puis CAB/AGENTS.md | Version 0.6 ; règles communes identiques, identités et racines conservées ; propagation limitée à CAB |
| PROJECT.md | Contrat distribué, suivi événementiel, périmètre CABU sélectif et version cible |
| TECHNICAL.md | Quatre nouveaux modules, continuité et références, cadences et compaction selon contexte, mise à jour sélective |
| BUILD.md | Version, dépendances distribuées et préparation/bascule ; ancien lecteur sans certificat distinct |
| README.md | Entrées CAB/CABU, procédures conditionnelles et séparation source/runtime |
| CHANGELOG.md | Entrée 2.2.0 « En préparation », sans prétention de livraison ou activation |
| DEVOPS.md | Régénération DIU externe observée le 2026-11-02T19:57:18Z ; outils et chemins nécessaires relus, versions de qualification conservées |
| DEVELOPMENT_MAP.md et BATCH_CODES.md | Amendements ciblés du seul change ; aucun nouveau code de lot attribué |
| OpenSpec | Deltas de continuité, récupération, shell, concurrence, efficacité et mise à jour ; validation strict réussie ; synchronisation finale non réalisée |
| Skill et commandes | Routeurs courts ; 77 segments des anciens supports ont une destination ; liens contrôlés ; correspondance de segments distincte d'une preuve sémantique automatique |
| ancien protocole local local | Retiré après contrôle des 77 segments et adaptation autorisée des renvois partagés ; empreinte dans retired-protocol.json |
| Projet prompts | 18 fichiers adaptés sur deux accords explicites ; 4 éléments OpenSpec strict valides ; contrats métier conservés, aucune publication ni autre propagation |
| Archives/statistiques/Git | Archive et synchronisation effectuées, rapport individuel vérifié, SGS recalculé ; publication Git attestée au bilan terminal |

L'objectif est de supprimer les impasses internes avec une prochaine action
qualifiée. Une permission manquante, une décision réservée ou un effet incertain
reste protégé et explicitement attribué ; il ne justifie pas de geler les
ressources indépendantes. Aucun test fini ne promet l'absence universelle de
panne ou de décision humaine.

## Reprise après accord du développeur

Les 18 empreintes de prompts étaient concordantes avant écriture. Le renvoi
normatif exigeant une lecture intégrale du fichier local a été remplacé par
la résolution du protocole via AGENTS.md ; les lectures intégrales des prompts
métier directs restent intactes. Le rappel de compactage renvoie au protocole
résolu sans figer une cadence technique. OpenSpec prompts : 4 éléments valides,
aucun échec en mode strict. Aucun autre fichier prompts n'a été écrit.

Le seul écart depuis la capture qualifiée était le référentiel nommé dans
AGENTS.md CAB : cab au lieu de template. La ligne a été rétablie depuis la
source template, conformément à l'accord existant, sans autre changement de
règles. Le fichier AGENTS.md du projet prompts observé nomme encore prompts
comme référentiel de ses règles ; ce fichier est hors des 18 cibles et n'a pas
été modifié par cette session. La consigne explicite du développeur sur template
prévaut pour la présente intervention.

## Clarification du référentiel et clôture documentaire

Le développeur a expliqué que DIU remplace l'ID du modèle par l'ID cible.
La phrase nommant un projet comme référentiel des règles était incompatible
avec ce mécanisme et avec la philosophie agnostique d'AGENTS.md. Elle a été
retirée du source et de CAB. Aucune règle de sécurité ni permission n'a été
modifiée par cette correction ; les différences de contexte restent les seules
différences entre les deux fichiers. Contrôles ciblés : 36 réussites.

Après archivage, la validation des spécifications canoniques a détecté trois
Purpose générés automatiquement et trois exigences trop longues. Ils ont été
complétés/condensés à portée constante, avec mise en cohérence des deltas de
cette archive, sans nouvel archivage. Les résultats stricts finaux sont retenus.

La clarification du développeur sur DIU a conduit à retirer la phrase
identifiante du référentiel source puis de CAB, plutôt qu'à la rétablir à chaque
synchronisation. Les renvois partagés gardent également la résolution générique,
sans ID de projet fixé dans les règles. Les champs d'identité de contexte sont
les seules différences entre AGENTS.md source et consommateur.

## Révision documentaire après reprise PA01

Le signalement de reprise a établi que le prévol du moniteur exigeait encore
2.1.81 dans trois références distribuées, malgré l'API conforme en 2.2.0.
L'attente est maintenant résolue depuis la version de base du manifeste CAB
installé. Les autres mentions courantes et le compte rendu up-to-date ont été
alignés ; les mentions explicites de transition historique 2.1.81 restent.
Un test empêche le retour de cette version figée dans les bootstraps. Les
scripts runtime restent inchangés ; cette révision documentaire utilise un
nouveau suffixe de cache pour CAB/CABU et ne nécessite aucun redémarrage.
