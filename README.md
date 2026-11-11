# Codex Approval Bridge — CAB

CAB crée ses nouveaux fichiers et répertoires en `0770` et accepte les anciens
modes compatibles avec les droits effectifs et les protections du protocole.

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
