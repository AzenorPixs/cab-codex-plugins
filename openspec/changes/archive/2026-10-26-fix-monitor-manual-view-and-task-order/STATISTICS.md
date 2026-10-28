# Statistiques SCM — CAB Monitor 1.10.4

## 1. Statistiques générales et décisions

Session directe SCM, projet Codex Approval Bridge, identifiant cab. Périmètre
validé : en-tête, vue manuelle persistante, tri et incrément de toutes les briques.
Le développeur a ensuite explicitement autorisé la correction de tous les
blocages et la finalisation du change. Le protocole commun a été corrigé dans
son référentiel template, puis synchronisé vers CAB ; aucun autre consommateur
n'est modifié. Archivage de ce seul change réussi le 26 octobre 2026 : six
spécifications synchronisées, quatre exigences ajoutées et vingt-huit modifiées,
aucune supprimée ou renommée. Aucun déploiement ou activation utilisateur.

Modèle exact, tokens, quotas et durée intégrale : N/A, absence de mesure initiale.
Aucune compétence ni télémétrie de statistiques pilotées SCMP déclenchée.

## 2. Types de messages et d'outils

Compteurs exhaustifs de messages et appels d'outils : N/A, non instrumentés.
Les décisions humaines de périmètre et de reprise sont conservées dans ce chat.
Les outils locaux ont servi à lire, corriger, vérifier et archiver les sources.
Aucun agent de codage délégué, RUN CAB ni permission native n'est créé.

Suites finales : Node 409 déclarés, 383 réussis, zéro échec, 26 ignorés ;
Python 73 déclarés et réussis. Total interlangages : 482 déclarés, 456 réussis,
zéro échec et 26 ignorés. Les 28 tests documentaires et 24 tests de maintenance
ciblés recouvrent ces suites et ne sont pas additionnés. Les qualifications
navigateur et les deux scénarios Docker sont rapportés séparément.

## 3. Fichiers modifiés

Les sources, tests, supports, commande et versions des briques sont recensés
dans output/scm/fix-monitor-manual-view-and-task-order/changed-files-final.json.
Les six spécifications canoniques et les artefacts de ce seul change sont inclus.
Le fichier ORCHESTRATED_CODING.md du référentiel template est corrigé ; sa copie
CAB est identique octet pour octet. La preuve est conservée dans
protocol-source-proof.json. AGENTS.md et DEVOPS.md gardent leurs empreintes
initiales au premier bilan ; une génération DIU ultérieure de DEVOPS.md est
conservée et examinée lors du commit global. Les trois copies broker sont identiques aux sources ; modes et
propriétaires des fichiers modifiés sont préservés.

Les dix fichiers finaux de l'archive sont proposal.md, design.md, tasks.md,
ce rapport et les six deltas. Le bilan de blocage devenu obsolète est nettoyé
seulement après vérification de ce rapport ; son historique reste dans les
preuves locales de la phase initiale. Aucun fichier d'une ancienne archive
n'est modifié. Lignes modifiées : N/A, aucun diff Git nécessaire à la mesure.

## 4. Commandes et validations

Syntaxe réussie : onze Python par py_compile et trente-quatre JavaScript par
node --check ; le test documentaire repris est revérifié après correction.
Python 73/73 et Node 383 réussis, zéro échec. Les 26 ignorés couvrent vingt-cinq
scénarios nécessitant un ancien paquet 1.7.1 absent et une intégration native
OpenCode optionnelle non activée ; ils ne constituent pas des succès exécutés.

Chromium et Firefox headless : en-tête et mobile, persistance après vingt
secondes, perte SSE, HTTP échoué et JSON invalide, sélection et détails,
expiration Web à trente minutes, gardes courantes sans POST ancien, tri absolu,
égalités, zéro, inconnus, filtres et snapshot non muté. Le banc complet conserve
aussi navigation, statistiques, rangement et redémarrage Web sur fixtures.
Ces sources n'ont pas changé après qualification, empreintes revérifiées.

Docker isolé, deux UID réels 1000/1002 : transition 1.10.3 vers les quatre
briques 1.10.4, succès puis réponse de déconnexion perdue. Registre public
5 218 616 octets et privé 5 657 060 octets. OpenCode, identités, sources broker
et PAUSE conservés ; écriture broker refusée par le noyau, aucun compte ou
droit hôte modifié. Le jeu original de runtime est une copie avant incrément.

Les cinq échecs documentaires initiaux sont résolus : bootstrap, catalogue,
coordination et sondes réconciliés dans le référentiel ; ancienne attente de
réessai PLLM remplacée par les règles courantes de fraîcheur initiale et de
conservation du choix. Les tests vérifient positivement ces invariants et
l'identité des supports, ainsi que l'absence de l'ancienne boucle automatique.
Aucun test n'est désactivé. Les sorties initiales restent conservées.

OpenSpec strict : 15/15 avant archive et 14/14 après synchronisation. Deux
formulations trop longues révélées par le contrôle canonique après archive
ont été condensées dans le canonique et les deltas archivés, sans perte de
scénario ou obligation ; aucun réarchivage. UTF-8/LF, six sections et totaux
de ce rapport sont vérifiés. Les étapes Git conditionnelles de SCM suivent
cette vérification ; leurs résultats sont consignés dans le bilan local.

## 5. Accès web et ressources

Aucune recherche documentaire externe, évaluation de fournisseur ou lecture
de quotas. HTTP/SSE loopback et services synthétiques dédiés aux tests ;
nombre exhaustif d'appels réseau : N/A, non mesuré. Aucun secret, environnement
privé ou état métier réel n'est utilisé comme source de rapport.

Les processus, ports, profils de navigateur et conteneur dédiés sont arrêtés
et nettoyés par les bancs. Les preuves et jeux d'entrée locaux sont conservés.
Les installations actives, caches de plugin et autres projets consommateurs
restent inchangés. Aucune surveillance ou boucle d'attente n'est active.

## 6. Synthèse globale

Les trois corrections demandées sont réalisées et qualifiées. Toutes les
briques et la distribution source sont alignées sur 1.10.4 avec cachebuster
neuf. Les cinq blocages sont corrigés, la matrice documentaire est cohérente,
le change est archivé et les six spécifications synchronisées. Le présent
rapport satisfait les six sections requises ; mesures absentes motivées.
Publication Git éventuelle, distribution du plugin, installation active et
reprise de RUN restent des effets distincts, rapportés selon leurs preuves.
