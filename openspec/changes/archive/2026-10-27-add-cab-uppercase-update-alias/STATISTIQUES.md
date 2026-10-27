# Statistiques SCM — commandes CAB 1.10.5

## 1. Statistiques générales et décisions

Projet Codex Approval Bridge, identifiant cab. Session directe SCM : commande
canonique `/CAB`, alias de compatibilité `/cab`, raccourci `/CABU` équivalent
exact de `/CAB update` sans argument et incrément de version 1.10.4 vers 1.10.5.
Aucun RUN CAB, agent délégué, permission native ou télémétrie SCMP créé.

Première borne d'exécution mesurée : 27 octobre 2026, 09:47:38 UTC.
Fin de mesure après archivage : 2026-10-27 09:58:31 UTC. Durée intégrale de la session,
tokens, quotas, modèle exact et nombre exhaustif d'appels : N/A, absence de
mesure instrumentée initiale. Aucune reconstruction rétroactive.

## 2. Types de messages et d'outils

Lectures ciblées, éditions locales, contrôles de syntaxe, tests, synchronisation
des spécifications et archivage OpenSpec. Compteurs exhaustifs de messages,
outils, approbations et refus : N/A, non instrumentés. Les tests de commandes
Markdown sont structurels ; ils ne prouvent pas leur enregistrement natif dans
l'application ou leur installation dans le profil réel.

Suite Node finale : 413 déclarés, 388 réussis, zéro échec, 25 ignorés.
Suite Python : 73 déclarés et réussis, zéro échec. Total interlangages :
486 déclarés, 461 réussis, zéro échec, 25 ignorés. Les 27 contrôles de
Distribution et 24 contrôles de mise à jour ciblés recouvrent ces suites et
ne sont pas additionnés. L'intégration OpenCode native est exécutée dans la
suite finale ; son passage isolé n'est pas ajouté. Les 25 tests ignorés
requièrent un ancien paquet 1.7.1 non fourni ; ils ne sont pas comptés comme
exécutés. La transition courante est qualifiée par le banc distinct à deux UID.

## 3. Fichiers modifiés

71 fichiers existants modifiés par rapport à la baseline de cette session :
commandes, constantes des composants et copies broker, métadonnées, unités,
HTML de version, tests, documentation et cinq spécifications courantes.
Deux nouveaux fichiers de commandes CAB.md et CABU.md ; cab.md devient
l'alias de compatibilité. Les neuf fichiers de cette archive comprennent
proposal.md, design.md, tasks.md, cinq deltas et ce rapport.
L'inventaire détaillé est conservé dans
output/scm/add-cab-uppercase-update-alias/changed-files-final.json.

AGENTS.md et DEVOPS.md sont identiques à la baseline. Le change actif
reconcile-pllm-waiting-policy et ses artefacts sont identiques à cette baseline.
Aucun ancien dossier d'archive n'est ciblé par les écritures. Les anciennes
entrées du changelog et les marqueurs des blocs des prompts consommateurs sont
conservés. Les copies broker sont identiques octet pour octet aux trois sources.

Revue documentaire : PROJECT.md section 5.5, TECHNICAL.md section 16,
BUILD.md installation/version/qualification, README.md syntaxe et CHANGELOG.md
entrée 1.10.5 mis à jour. ORCHESTRATED_CODING.md et références embarquées
reprennent la casse et la version courantes ; formats et gardes métier conservés.
AGENTS.md et DEVOPS.md restent inchangés avec justification dans tasks.md.
Les cinq spécifications synchronisées concordent exactement avec leurs deltas.

## 4. Commandes et validations

- Syntaxe : 33 JavaScript par node --check et 11 Python par py_compile, réussis.
- node --test --test-concurrency=1 tests/*.test.mjs avec CAB_TEST_OPENCODE
  explicitement renseigné : 388 réussis, zéro échec, 25 ignorés.
- python3 -m unittest discover -s tests -p 'test_*.py' : 73 réussis.
- node tests/web-monitor-browser.mjs : Chromium et Firefox headless réussis.
- tests/helpers/run-readonly-broker-two-uid.py avec --large-registry et
  --worker-broker : deux scénarios réussis, success et disconnect-reply-lost.
  Origine 1.10.4, quatre briques chargées 1.10.5. Registre public 5 218 616
  octets et privé 5 657 060 octets ; UID 1000/1002 réels, écriture broker
  refusée par le noyau, sources, OpenCode, identités et PAUSE conservés.
- OpenSpec ciblé strict réussi ; validation globale standard et stricte
  avant archivage : 16/16 éléments valides, aucun diagnostic. Après archivage :
  15/15 valides. Un espace final hérité sur une ligne de spécification dont la
  casse est actualisée est retiré dans le canonique et son delta avant commit.
- openspec archive add-cab-uppercase-update-alias --skip-specs --yes --json :
  réussi. Les cinq spécifications ont été synchronisées et vérifiées avant
  cette commande ; --skip-specs évite une seconde application des ajouts.

Échecs intermédiaires résolus : exigences OpenSpec ajoutées trop longues,
puis exigence canonique de distribution trop longue ; attente de test qui
classait encore 1.10.5 comme inconnue, remplacée par 1.10.6 ; premier lancement
Chromium échoué, qualification relancée avec un chemin temporaire plus court ;
image Docker absente, récupérée avant le banc. Les sorties initiales et finales
sont conservées dans output/scm/add-cab-uppercase-update-alias/.
Aucun test désactivé ni garde affaiblie ; 1.10.4 reste admise pour la maintenance.
UTF-8/LF, présence des six sections, totaux et rapport vérifiés après écriture.
Les résultats Git conditionnels sont consignés séparément après ce rapport.

## 5. Accès web et ressources

Aucune recherche documentaire web, évaluation fournisseur, lecture de quota,
installation du profil Codex ou mise à jour de service CAB actif. Réseau de test
HTTP/SSE loopback et récupération de l'image officielle debian:stable-slim,
digest sha256:a717a33469731894e77e912ea7d714e27c2dc38ee6554fd1a3102e92999cfc66.
Nombre exhaustif d'accès réseau : N/A, non instrumenté.

Les bancs nettoient leurs processus, ports, profils de navigateur et conteneur
dédiés. Le conteneur utilise des entrées hôte en lecture seule ; comptes et
droits hôte inchangés. Les preuves et jeux de sources locaux sont conservés.
Les caches de plugin, installations actives et autres projets consommateurs
ne sont pas modifiés par la préparation source. La publication Git éventuelle
relève des étapes conditionnelles de clôture SCM et reste distincte des tests.

## 6. Synthèse globale

Les sources livrent `/CAB` en majuscules, `/cab` compatible et `/CABU` sans
argument avec procédure update unique. Le jeu de trois commandes est préparé,
vérifié et publié avec préservation des copies divergentes/plus récentes et
restauration des seules commandes remplacées en cas d'échec. Les briques,
commandes et manifeste sont alignés sur 1.10.5 avec cachebuster neuf.

Réalisation et validations applicables achevées ; change archivé, cinq
spécifications synchronisées et rapport à six sections produit. Les étapes
Git conditionnelles suivent la vérification de ce rapport ; aucun résultat de
publication, installation ou enregistrement natif n'est inventé.
