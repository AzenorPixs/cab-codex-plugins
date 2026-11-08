# Codex Approval Bridge — CAB

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
