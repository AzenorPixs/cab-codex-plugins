# Rapport d'archivage SCM — support-readonly-broker-reuse

Projet : Codex Approval Bridge (cab). Version source finale : 1.9.0.
Date : 25 octobre 2026, Europe/Paris. SCM direct, sans pilotage produit.
Archive : 2026-10-25-support-readonly-broker-reuse.

## 1. Statistiques générales et décisions

Le développeur a validé la réalisation du nouveau mode de réutilisation broker,
puis demandé ici l'incrément mineur 1.8.0 vers 1.9.0. La maintenance distingue
les trois artefacts externes et le processus chargé. Elle n'installe pas le
broker externe ; après intention durable de déconnexion, elle conserve le gel
sur erreur et permet une récupération vérifiée sans faux rollback.

| Qualification unitaire distincte | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, suite complète séquentielle | 371 | 0 | 1 | 372 |
| Nouveau scénario avant intention, exécuté séparément | 1 | 0 | 0 | 1 |
| Python unittest | 72 | 0 | 0 | 72 |
| Total distinct | 444 | 0 | 1 | 445 |

Réussite des cas exécutés : 444/444, soit 100 %. Cas ignorés : 1/445,
soit 0,22 %. Les répétitions intermédiaires ne sont pas additionnées. Les deux
scénarios Docker à deux UID réels et les deux navigateurs sont qualifiés
séparément, sans double comptage dans le total unitaire. Syntaxe : 42 fichiers.

RUN de pilotage, modèle exact mesuré, tokens, coût, quotas, cache, débit et
durée exhaustive : N/A, aucune télémétrie de pilotage normalisée n'est lancée
par SCM. Aucun relevé de quota ni compétence de statistiques pilotées n'est
invoqué. La session consommatrice n'est pas exécutée par ce SCM.

## 2. Types de messages et d'outils

Lectures ciblées, rg, empreintes, éditions CAB, syntaxe Node/Python, processus
isolés et fixtures HTTP/SSE/MCP, adaptateur de services, Docker dédié,
Chromium/Firefox et CLI OpenSpec. L'accord humain transmis a été vérifié dans
le chat propriétaire, puis le périmètre CAB/SCM et la version ont été confirmés
ici. Aucun sous-agent, message sortant vers un autre chat ou commande Git.

Les processus des services et de l'outil sont réellement UID 1000 dans le banc ;
le serveur OpenCode simulé et son véritable broker Python sont UID 1002.
L'ouverture en écriture du broker est refusée par le noyau à UID 1000. Le banc
vérifie le reçu durable avant de laisser appliquer la déconnexion, puis la
reprise après perte de réponse. Les comptes et fichiers du conteneur sont
éphémères. Aucun compte, droit, groupe, configuration ou service hôte ne change.
Nombre exhaustif des outils et messages : N/A, absence de collecte normalisée.

## 3. Fichiers et cohérence documentaire

Le change ajoute broker-artifact-proof.mjs et les deux auxiliaires du banc,
étend update.mjs et les deux fichiers de tests ciblés, documente le mode et
aligne les briques source/distribuées en 1.9.0. Trente modules annoncent 1.9.0.
Les trois copies broker sont identiques à src/. Les sources de lancement du
broker ont reçu le seul changement de version demandé ; leurs UID/GID 1002,
mode 0775 restent vérifiés. Aucun broker vivant n'est relancé ici.

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte conservée ; sécurité et autorisations respectées. |
| PROJECT.md | Référence 1.9.0 et réutilisation du broker externe. |
| TECHNICAL.md | Preuve, versions distinctes, intention, gel et récupération documentés. |
| BUILD.md | Nouveau module distribué et banc isolé à deux UID. |
| DEVOPS.md | Inchangé ; chemins et conteneur autorisé effectivement utilisés. |
| README.md | Présentation 1.9.0 et nouveau mode, sans activation implicite. |
| CHANGELOG.md | Entrée 1.9.0 ajoutée, historique 1.8.0 conservé. |
| OpenSpec | Cinq exigences ajoutées, vingt-deux modifiées et un intitulé versionné renommé dans quatre capacités ; aucune suppression. |
| Protocole, commande, références, manifeste | Annonces 1.9.0, cachebuster neuf et cohérence distribuée testée. |

source-final.json contient les inventaires et empreintes : 59 fichiers existants
modifiés avant synchronisation des quatre canons, 42 fichiers syntaxiquement
valides, trente versions et cinq gardes identiques à l'original 1.7.1. Les anciens
modules hors moteur modifié et nouveau vérificateur gardent leurs corps après
neutralisation du seul incrément de version. Les vingt fichiers des archives
L1/L2 sont conservés à l'identique. Textes UTF-8/LF, aucun secret livré.

## 4. Commandes et résultats

- node --test --test-concurrency=1 tests/*.test.mjs : exécutée et réussie,
  371 réussis et un ignoré sur 372 ; node-serial-final.txt.
- node --test --test-name-pattern='lecture seule.*before-intent-crash'
  tests/maintenance-bootstrap.test.mjs : exécutée et réussie, 1/1 ;
  before-intent-final.txt. Seul ce scénario a été ajouté après la suite complète,
  sans changement produit ; il n'est compté qu'une fois.
- python3 -m unittest discover -s tests -p 'test_*.py' : exécutée et réussie,
  72/72 ; python-final.txt.
- python3 -B tests/helpers/run-readonly-broker-two-uid.py --original-plugin
  <cache original> : exécutée et réussie, deux scénarios en 1.9.0 ;
  two-uid-final.txt et two-uid-result.json. Image sha256:a717a33469731894e77e912ea7d714e27c2dc38ee6554fd1a3102e92999cfc66.
- node tests/web-monitor-browser.mjs : exécutée et réussie sous Chromium et
  Firefox ; browser-final.txt.
- node --check et python3 -m py_compile : exécutées et réussies, 42 fichiers ;
  source-final.json. Cache Python de validation sous CAB.
- openspec validate --all --strict --json : exécutée et réussie avant archive,
  14/14 dont le seul nouveau change ; openspec-before-archive.json.
- openspec archive support-readonly-broker-reuse --yes --json : exécutée et
  réussie, code 0, archive réelle ci-dessus ; archive.json. Synchronisation
  native des cinq ajouts, vingt-deux modifications et du renommage d'intitulé.

Les traces sont sous .cab-readonly-work ; les binaires sont ceux de DEVOPS.
Lint, types et build tiers distincts : non disponibles, aucune chaîne configurée.
ShellCheck : non pertinent, aucun shell modifié. Le test OpenCode produit opt-in
est non exécuté. Installation et activation réelles sont non exécutées, hors
périmètre. Les qualifications Docker ne sont pas une intégration produit.

Les essais intermédiaires ont relevé un groupe mal déclaré dans une fixture et
un alias Python absent du conteneur ; ils ont été corrigés dans le banc et les
traces conservées. Un timeout ancien sous concurrence globale a été levé par
la suite complète séquentielle, sans modifier le produit pour masquer l'échec.
La première tentative d'archive a refusé un intitulé contenant la version ;
elle n'a modifié aucun fichier. Le renommage formel 1.8.0 vers 1.9.0 a ensuite
été déclaré dans le delta, validé puis archivé. Aucun archivage réussi n'est rejoué.

## 5. Accès web

Aucune recherche web externe. HTTP/SSE/MCP et navigateurs utilisent seulement
les fixtures du projet. Le conteneur est sans réseau externe et ses montages
hôte sont en lecture seule. Aucun magasin privé ou secret du consommateur
n'est consulté. Nombre et volume exhaustifs d'appels : N/A, collecte absente.
Les messages reçus sur la résolution R0 ne déclenchent aucune action vivante ici.

## 6. Synthèse globale

Le complément générique CAB est qualifié et archivé en 1.9.0 : 444 tests réussis,
un opt-in ignoré, deux scénarios réels à deux UID, deux navigateurs et 42 fichiers
syntaxiquement valides. Les copies broker et cinq gardes sont conservées selon
les preuves ; les archives L1/L2 restent closes et identiques. Le présent
rapport individuel contient les six sections et distingue les mesures absentes.

La préparation source ne déploie pas CAB et ne reprend aucun métier. Le broker
consommateur ancien n'est pas redémarré depuis ce chat. ACTIVATION.md décrit
la procédure future et les contrôles à faire autoriser séparément.

Contrôle après synchronisation : quatre paragraphes d'exigence dépassaient
la borne de longueur du mode strict. Ils sont reformulés sans changement de
contrat, identiquement dans ce delta archivé et son canon, sans réarchivage.

Clôture vérifiée : OpenSpec global strict 13/13 après synchronisation,
27 exigences correspondantes dans les canons, tâches terminées, rapport
individuel à six sections et archives L1/L2 inchangées. Aucun réarchivage.
