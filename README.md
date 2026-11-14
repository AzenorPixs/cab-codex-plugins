# Codex Approval Bridge — CAB

## CAB 3.2.6

Le contrôle MCP utilise d'abord l'API native de l'instance réellement raccordée,
avec reçu durable et blocage des effets indécis. Codex CLI a un profil distinct ;
les versions CLI GitHub et Desktop ChatGPT/APT sont séparées. CAB utilise les
accès OS effectifs sans imposer ni normaliser les modes POSIX existants.
Voir docs/platform-operations.md pour la première adoption des sockets.

Le codeur corrige en autonomie un contrôle de finalisation récupérable, sans
intervention SQL ni accord intermédiaire. Historique et reçus restent conservés ;
CAB exige une preuve nouvelle et expose les actions manquantes. Les critères
et la revue finale réservée restent protégés.

Arrêt MCP borné par politique et pidfd, avec escalade SIGTERM/SIGKILL seulement
à frontière sûre. Les versions connectées sont poussées en direct sur Agents
et dans le bandeau (boule et texte verts), sans rafraîchissement de page.
[Politique et capacités des relais](docs/mcp-stop-policy.md).

Les connecteurs utilisent un relais stdio stable et remplacent leur moteur à
une frontière sûre après CABU, sans rejouer les requêtes. Le reçu distingue la
reconnexion vérifiée d'une reprise native requise pour un ancien connecteur :
[parcours MCP](docs/mcp-reload.md).

Les nouveaux RUN déclarent un contrat de finalisation. CAB capture les reçus,
assemble le dossier, ferme les périodes/statistiques et clôture sur preuves sans
commande finale du codeur. Les décisions réservées restent explicites et les
preuves manquantes sont visibles. Contrat indépendant de l'outil de publication :
[parcours et API](docs/run-finalization.md).

CAB réévalue et clôture automatiquement les RUN normalement acceptés et archivés
sur preuves, sans rejeu. L'interface propose Réévaluer/clôturer, les diagnostics
de protection et Archives pour conserver les sessions CLOSED validées.

Les RUN directs historiques archivés disposent d'une régularisation explicite
sur preuves, sans réexécution ni reçus de tests reconstruits. Procédure et
protections : [opérations](docs/platform-operations.md).

CAB porte désormais le cycle statistique complet : STATISTICS.md locaux maîtres,
PG projection et historique, catalogue de tous les changes, inotify et rattrapage
aléatoire12–24h. Rapports individuels/globaux générés par le service, sans LLM ni
verrou fichier. Contrat et champs : docs/sgs-schema.md. Les descriptions2.x des
moteurs SGS autonomes ci-dessous sont historiques et ne sont plus applicables.


Les statistiques du change utilisent des périodes début/fin par RUN/SID : un
contexte actif par SID, bascule autonome, agrégation multi-RUN/multi-sessions
sans totaux partagés. Couverture incomplète : N/A, pas de rétroactivité. Parcours
et limites dans docs/platform-operations.md et docs/sgs-schema.md.


Plateforme système Debian pour les sessions de codage directes et pilotées.
Un seul cab.service, PostgreSQL indépendant, API Django/OpenAPI, suivi Web
TanStack/Electric sur8790. L’agent de codage réalise et coordonne en autonomie ;
l’orchestrateur traite le cadrage initial, les exceptions et la revue finale.

Le paquet fournit le moteur et les clients `/usr/bin/cab`, les plugins légers
CAB/CCAB/CABU et les commandes. Après installation, ouvrir le parcours Web
local sur http://127.0.0.1:8790 et utiliser le code local obtenu par
`sudo cab bootstrap-token`. Aucune base CAB n’est créée avant validation Web.
Ne pas communiquer le code ou les mots de passe dans une conversation.

L’administration Web propose Agents, Base de données, Interface, Projets et
Serveur Web. Le catalogue PostgreSQL crée les dossiers sous l’identité POSIX
configurée. Les réglages privés et origines Web sont propres à chaque hôte.
Après archivage d’un change direct, `run.reconcile_archive` relocalise son
mandat à frontière sûre sans modifier ses identités, son gel ni ses reçus.

Documentation d’administration : [docs/platform-operations.md](docs/platform-operations.md).
L’architecture et les contrats 2.x ci-dessous sont conservés pour l’historique ;
ils ne constituent pas la procédure d’installation de la plateforme3.0.0.

Les fichiers des projets utilisent les droits de groupe prévus, dont `0770`.
Les secrets et configurations système gardent leurs permissions privées propres ;
les modes compatibles existants sont conservés.

## Coordination et bancs autonomes CAB 2.7.0

Les codeurs opèrent les déclarations, avis, vérifications et acquittements dans leur
mandat ; le parent traite les exceptions et la revue finale. Le transport cible les
codeurs, avec IPC broker inter-UID, provenance historique et transfert explicite.
Les accès partagés sont sérialisés par opération ; les pauses et effets incertains
restent protégés. Voir [le contrat](plugins/cab-approval-bridge/skills/approval-bridge/references/coder-coordination.md).
Le [profil SSH externe](plugins/cab-approval-bridge/skills/approval-bridge/references/external-execution.md)
permet les essais autonomes sur banc conteneur réservé, credentials locaux et reçus
sans rejeu, avec nettoyage vérifié avant restitution. Aucun shell hôte général.
La présence source et la qualification ne prouvent pas l’activation.

## Mandat autonome CAB

Les nouvelles missions pilotées suivent un cadrage initial et une revue finale.
Développeur et orchestrateur tranchent les choix nécessaires avant le codage.
Dans le mandat, le codeur réalise et teste sans validation intermédiaire.
Exceptions : hors change, hors cadrage, outil nécessaire absent, consultation web.
Les sources et tests sont liés par empreinte à l’acceptation finale ; la publication
requiert cette acceptation. Identités, isolation, réservations et reçus restent contrôlés.
Les anciennes descriptions unitaires concernent les RUN historiques ; le contrat
[autonome distribué](plugins/cab-approval-bridge/skills/approval-bridge/references/autonomous-mandates.md)
prévaut pour les nouvelles missions. Une présence source ne prouve pas l’activation.


La coordination directe et pilotée utilise un adaptateur commun,
`cab-session-coordination-1`, découvert sans démarrage de service. Le contrat
métier des prompts est maintenu dans son propre projet.

La clé HMAC locale du journal accepte les droits `0770` du groupe vérifié,
en coordination avec la normalisation DIU, sans accès pour les autres comptes.

CAB 2.5.0 comprend une interface de coordination des dépendances entre sessions ;
sa qualification isolée ne vaut pas activation de la distribution.

La projection de nettoyage évite les calculs répétés pour réduire la durée de maintenance.

Le nettoyage d’un change clos peut retirer sa copie statistique CAB tout en conservant son rapport source dans le projet.
Il conserve les approbations des autres sessions et les événements nécessaires à leur cohérence.

Le Web Monitor présente les sessions CAB directes et les RUN pilotés du même projet, avec leur mode et leur identité.

CAB coordonne un agent orchestrateur et un agent de codage OpenCode : mandats,
validations, accès aux ressources, reprise des échanges et suivi des sessions.
Il fournit aussi des statistiques et une file d’incidents utilisables en
session directe Codex lorsque ce mode est explicitement demandé.

## Référentiel du projet

Les changes, leurs exigences et leurs dépendances se vérifient dans
[OpenSpec](openspec/) et les fichiers de cadrage. Le registre CAB décrit
l’exécution des sessions ; il ne remplace pas ce référentiel.

| Document | Rôle |
|---|---|
| [AGENTS.md](AGENTS.md) | Règles de travail et autorisations |
| [PROJECT.md](PROJECT.md) | Objectifs et architecture |
| [TECHNICAL.md](TECHNICAL.md) | Contrats techniques |
| [BUILD.md](BUILD.md) | Installation, qualification et déploiement |
| [DEVOPS.md](DEVOPS.md) | Environnement local observé, généré par DIU |
| [DEVELOPMENT_MAP.md](DEVELOPMENT_MAP.md) | Navigation entre lots, changes et dépendances |

## Composants

| Composant | Responsabilité |
|---|---|
| Contrôleur | Applique les décisions, les mandats et les protections des ressources |
| Broker MCP | Transporte les demandes et réponses entre OpenCode et CAB |
| Superviseur | Observe les sessions et leur progression |
| Web Monitor | Présente les RUN, les statistiques, les incidents et les archives conservées |
| SGS | Collecte et conserve les statistiques avec leur provenance |
| CCAB | Coordonne le traitement des incidents puis nettoie les entrées traitées |
| CABU | Prépare, applique et vérifie les mises à jour par transaction |

Les services conservent uniquement les données utiles à leur rôle.
Une décision, un accès et une permission native sont des objets distincts.
Une réponse réseau perdue ne permet pas de rejouer un effet ou une once.

Une interface expérimentale de boîte de dépendances est décrite dans sa
[référence](plugins/cab-approval-bridge/skills/approval-bridge/references/session-dependencies.md).
Elle ne prouve pas la notification native d'une session ni l'authentification
entre sessions du même compte ; son intégration reste en cours.

## Utilisation

Les plugins CAB, CABU et CCAB distribuent les skills, les commandes et leurs
références. Les modalités d’installation et les prérequis figurent dans
[BUILD.md](BUILD.md). Le [noyau du protocole](plugins/cab-approval-bridge/skills/approval-bridge/references/protocol-core.md)
et son [index](plugins/cab-approval-bridge/skills/approval-bridge/references/protocol-index.md)
décrivent le contrat applicable aux agents.

- `/CAB status` consulte l’état ; `--run <run_id>` cible un RUN.
- `/CAB start`, `/CAB run` et `/CAB resume` suivent les mandats de pilotage.
- `/CABU` lance la procédure de mise à jour et vérifie les composants actifs.
- `/SGS` donne accès au traitement des statistiques selon le mode demandé.
- `/CCAB` déclare, consulte ou traite les incidents sous le mandat applicable.

Pour une session Codex directe, demander explicitement CAB en mode direct.
SGS et le Web Monitor suivent alors cette session sans créer de session
OpenCode ou d’orchestrateur fictif.

## Autonomie et atelier de test

Dans le change validé, l’orchestrateur décide, contrôle et valide ; l’agent de
codage réalise le travail avec les libertés accordées. Les lectures et
l’exploration sont autonomes dans ce périmètre. Toute écriture projet hors
atelier et tout accès web requièrent la validation prévue par le protocole.
Les actions hors change et les ressources supplémentaires relèvent du développeur.

Chaque projet possède un atelier `.cab-tests/<change>/<RUN>/`. L’agent peut
y créer, modifier et copier des fichiers du change sans autorisation
supplémentaire, en préservant les espaces des autres sessions. L’atelier est
prioritaire pour les tests ; le codeur justifie le recours à LXC ou Docker
et l’orchestrateur tranche. Les résultats de tests sont soumis à sa validation.
Une extension compatible peut ajouter la lecture de cet atelier propre ; un
transfert vers le projet reste soumis à la validation de l’orchestrateur.

## Statistiques, incidents et nettoyage

SGS collecte les mesures natives disponibles, dont les tokens, le cache,
les modèles et la chronologie des rôles. Les mesures indisponibles restent
signalées comme telles. La vue Stats du Web Monitor lit SGS.

CCAB propose une file FIFO par défaut, avec regroupement justifié des
incidents de cause commune. Le correcteur se coordonne avec les déclarants,
livre les correctifs nécessaires ou répond sans correctif avec les limites
constatées. Après réponse et clôture, les entrées traitées sont nettoyées,
individuellement ou par lot, sans attendre les autres.
La coordination ciblée avec le correcteur désigné est autorisée même entre
projets ; elle ne transmet que les preuves nécessaires et ne modifie pas les mandats.

La clôture autorisée d’un change nettoie ses sessions puis ses données
opérationnelles, en conservant les pairs et les rapports métier requis.
Un RUN en cours est refusé au nettoyage. Une pause ou un incident technique
ne vaut pas clôture. La vue Archives montre les contenus réellement conservés
et permet leur suppression explicite par le développeur.

## Développement et maintenance

Les évolutions suivent le mandat SCM, les spécifications applicables,
les tests ciblés, le CI/CD puis CABU lorsque la distribution est modifiée.
Une qualification source, une publication et une activation se vérifient
séparément.

Le [CHANGELOG](CHANGELOG.md) contient l’historique des versions.
Les procédures détaillées restent dans les références du protocole ; ce
README présente l’utilisation courante du projet.

## Installation et suivi3.0.3
Une mise à jour du paquet par DIU/APT finalise aussi les plugins, skills et commandes
CAB des comptes configurés, sans second téléchargement ou réinstallation. Le suivi
Web propose les onze étapes et les tâches de chaque change, avec un détail par RUN.

La page /agents distingue les trois programmes et leurs transports MCP. Les
projets utilisent leur identifiant métier dans les URL, sans modifier leurs
identités internes ; voir docs/platform-operations.md pour la compatibilité.


L’accueil `/projects/<ID>` est la destination de la sélection d’un projet et
de sa maison ; les sessions sont accessibles à `/projects/<ID>/sessions`.
Les valeurs publiques de `project.env` sont mémorisées dans `projects` pour
un premier affichage immédiat. La relecture à la sélection et la surveillance
externe actualisent ensuite l’écran par Electric, sans bloquer l’affichage.
Nom, version, types et cartes de forges sont filtrés ; aucun secret n’est exposé.

La mise à jour CAB peut être demandée par le MCP cab_update ou par le bouton
permanent de /administration/update. CAB conduit seul le job durable via
cab-update.service, hors du groupe du service actualisé, et retourne OK avec
la version uniquement après vérifications Debian, READY et finalisation.
Tout client CAB actif authentifié est admis pour cette seule opération officielle,
sans liste de comptes, commande arbitraire ou sudo client. Les reçus inconnus
restent protégés et ne provoquent aucune réinstallation automatique.

L’accueil vérifie la disponibilité GitHub en arrière-plan à partir d’un cache
partagé. Aucun contrôle automatique n’est rejoué dans les24h suivant le précédent ;
le prochain est tiré au sort dans les24h après expiration. Une version plus
récente confirmée affiche l’étiquette Mise à jour près de la version locale.
La page /administration/update montre les deux versions, force un contrôle
asynchrone à chaque ouverture et propose le bouton manuel permanent.

Le contrôle forcé administratif est l’exception explicite au cache automatique24h.
