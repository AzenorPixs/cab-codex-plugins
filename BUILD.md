# BUILD.md — CGPT Approval Bridge (CAB)

## 1. Objet

Ce document définit le cadrage de construction, d'installation, de packaging et de distribution de CAB. Il complète `PROJECT.md` et `TECHNICAL.md` sans reprendre leur contenu.

## 2. État actuel de la distribution

CAB est actuellement un dépôt source autonome comprenant le broker Python, le plugin Codex, la skill, la commande `/cab` et les scripts Node.js de contrôle et de supervision.

Aucun Dockerfile ni format de paquet système n'est actuellement défini dans les sources CAB. Une image Docker ou un paquet Debian ne constitue donc pas encore un mode de distribution du projet.

## 3. Arborescence de distribution

```text
CAB/
├── src/                 # bridge Python
├── codex/
│   ├── commands/        # commande /cab
│   └── plugin/          # plugin distribuable Codex
├── PROJECT.md
├── TECHNICAL.md
├── BUILD.md
├── README.md
└── CHANGELOG.md
```

Les caches d'installation Codex ne font pas partie des sources du projet.

## 4. Prérequis d'exécution

### 4.1 Broker

- Python 3 ;
- système Unix compatible avec le verrouillage utilisé par CAB ;
- accès en lecture/écriture à l'espace persistant CAB ;
- OpenCode capable de lancer un serveur MCP local `stdio`.

Le broker n'utilise actuellement aucune dépendance Python tierce.

### 4.2 Plugin et contrôleur

- Node.js avec les API Web utilisées par les scripts ;
- commande `codex` permettant `codex app-server` ;
- accès local à OpenCode ;
- possibilité d'exécuter le contrôleur hors sandbox.

### 4.3 Supervision système

Le healthcheck actuel peut redémarrer le contrôleur avec `systemctl --user`. Une distribution sans systemd utilisateur devra fournir un mécanisme équivalent ou adapter ce composant.

## 5. Installation du broker dans OpenCode

OpenCode doit déclarer CAB comme serveur MCP local `stdio`.

Le point d'entrée source est :

```text
src/cgpt_approval_bridge_server.py
```

Les trois modules Python CAB doivent être installés dans un même emplacement importable :

```text
cgpt_approval_bridge_server.py
cgpt_approval_bridge_router.py
cgpt_approval_bridge_journal.py
```

Le broker doit disposer d'un espace persistant en écriture pour son magasin, son journal, ses verrous, son checkpoint et l'état du circuit breaker.

## 6. Installation du plugin Codex

La source du plugin se trouve sous :

```text
codex/plugin/
```

Elle contient :

```text
.codex-plugin/plugin.json
skills/cgpt-approval-bridge/SKILL.md
scripts/cgpt-approval-bridge-controller.mjs
scripts/cgpt-approval-bridge-healthcheck.mjs
scripts/cgpt-approval-bridge-opencode-sse-client.mjs
```

La commande `/cab` est maintenue séparément dans :

```text
codex/commands/cab.md
```

Le dépôt source reste l'autorité. Un répertoire de cache ou d'installation Codex ne doit jamais devenir la source de développement.

## 7. Versionnement

CAB doit utiliser une version de projet explicite et cohérente entre les artefacts distribués. La version de base actuelle est `0.61.0` pour le broker et le plugin ; le plugin ajoute uniquement un cachebuster Codex à cette version.

Les releases Git devraient être identifiées par des tags de forme :

```text
vMAJOR.MINOR.PATCH
```

Le `CHANGELOG.md` accompagne les releases et décrit les changements significatifs.

Les numéros de version du broker et du plugin doivent être synchronisés ou leur relation explicitement documentée.

## 8. Publication du plugin

Aucun catalogue marketplace n'est actuellement distribué avec CAB. Le canal de publication et son format devront être retenus et validés contre la documentation Codex avant une release publique ; ils ne doivent pas être simulés par un manifeste vide.

## 9. Forge et distribution Git

Le dépôt Git CAB constitue la source de vérité de développement.

Il peut être publié sur une forge distante principale et, si le mécanisme de distribution Codex l'exige, être synchronisé vers une forge compatible avec la publication du plugin.

Les artefacts générés, caches, états runtime et secrets ne doivent pas être versionnés.

## 10. Construction reproductible

Une release doit pouvoir être reconstruite uniquement à partir :

- du commit Git correspondant ;
- de la version déclarée ;
- des dépendances documentées ;
- des outils de packaging explicitement retenus.

Aucune donnée runtime provenant de `.opencode/state`, d'un cache Codex ou d'une session OpenCode ne doit entrer dans l'artefact distribué.

## 11. Contrôles avant release

Avant publication :

1. vérifier la syntaxe Python ;
2. vérifier la syntaxe JavaScript ;
3. valider `.codex-plugin/plugin.json` ;
4. exécuter les tests CAB applicables ;
5. vérifier `/cab test` dans un environnement d'intégration ;
6. vérifier l'absence de secret ;
7. vérifier que les caches et états runtime sont absents ;
8. vérifier la cohérence des versions ;
9. mettre à jour `CHANGELOG.md` et `README.md`.

## 12. Packaging système futur

Un paquet Debian pourra être envisagé pour installer le broker, les scripts du contrôleur, les unités utilisateur nécessaires et la documentation.

Ce mode n'est pas encore spécifié et ne doit pas être implémenté implicitement.

## 13. Conteneurisation future

Une conteneurisation éventuelle devra respecter l'architecture CAB, notamment :

- MCP `stdio` entre OpenCode et le broker ;
- persistance explicite des états ;
- interfaces du contrôleur limitées au local ;
- accès nécessaire au Codex App Server ;
- séparation entre environnement OpenCode et contrôleur hors sandbox.

Le projet actuel ne définit aucune image Docker CAB.
