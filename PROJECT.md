# PROJECT.md — Codex Approval Bridge (CAB)

## 1. Objet

Codex Approval Bridge, abrégé **CAB**, est un projet autonome de liaison, de validation et de supervision entre **OpenCode** et **Codex**.

CAB permet à OpenCode de soumettre à Codex des demandes de validation explicites pendant une session de travail, puis de recevoir une décision corrélée. Le pont transporte, persiste et supervise ces échanges sans décider à la place de Codex et sans modifier le projet piloté.

## 2. Finalité

CAB vise un pilotage OpenCode–Codex explicite, observable, traçable, persistant, résilient aux interruptions, contrôlable et indépendant du projet suivi.

CAB est une infrastructure de coordination. Il n'est ni un agent de codage, ni un moteur de décision autonome, ni une source de vérité fonctionnelle du projet piloté.

## 3. Principes architecturaux

### 3.1 Séparation des responsabilités

1. **OpenCode** réalise le travail et émet les demandes de validation.
2. **Le broker CAB** transporte, corrèle, persiste et restitue les validations.
3. **Le contrôleur Codex** sollicite Codex et conserve la décision destinée au broker.
4. **La supervision CAB** observe l'ensemble et expose un état synthétique.

### 3.2 Broker neutre

Le broker peut recevoir, corréler, persister, notifier, récupérer une décision, la restituer et effectuer des remédiations techniques explicitement autorisées.

Il ne doit jamais décider à la place de Codex, transformer une absence de réponse en approbation, modifier le projet OpenCode ou lancer un travail de développement.

### 3.3 Corrélation explicite

Chaque demande est corrélée par un `requestId` stable. Une décision doit correspondre à la demande exacte qui l'a provoquée. Une décision déjà consommée ne doit pas pouvoir être remplacée par une décision contradictoire.

### 3.4 Persistance et traçabilité

CAB conserve l'état courant des approbations, leur historique, les éléments nécessaires à la reprise après interruption et les informations de diagnostic.

### 3.5 Supervision indépendante

CAB distingue disponibilité des processus, activité des transports et progression métier réelle. Un processus vivant ou un échange réseau actif ne suffit pas à déclarer le système sain.

## 4. Architecture fonctionnelle

```text
OpenCode
   │
   │ MCP stdio local
   ▼
Codex Approval Bridge
   │
   │ HTTP local
   ▼
Contrôleur Codex
   │
   ▼
Codex / Codex App Server

OpenCode ───────── SSE HTTP direct ─────────► supervision CAB
```

Le transport entre OpenCode et le broker est exclusivement **MCP stdio local**. Le broker n'expose pas de serveur MCP réseau.

## 5. Composants

### 5.1 Broker MCP

Le broker constitue le cœur de CAB. Il gère les validations, la corrélation, la persistance, le journal, les expirations, la reprise, la readiness, le diagnostic et les remédiations techniques contrôlées.

### 5.2 Contrôleur Codex

Le contrôleur reçoit les demandes du broker, sollicite Codex dans un contexte de validation dédié et rend les décisions disponibles au broker. Il ne remplace pas le broker et ne modifie pas le projet suivi.

### 5.3 Supervision

CAB observe OpenCode par une voie SSE directe indépendante du cycle MCP. Cette voie sert à confirmer l'activité réelle et à réconcilier l'état après reconnexion ou divergence.

### 5.4 Plugin Codex

Le plugin regroupe la skill `cgpt-approval-bridge`, les scripts du contrôleur et de supervision ainsi que les métadonnées nécessaires à son intégration Codex. Sa marketplace est versionnée à la racine du dépôt dans `.agents/plugins/marketplace.json` et le plugin dans `plugins/cab-approval-bridge/`.

### 5.5 Commande `/cab`

`/cab` est une commande destinée à l'agent Codex et versionnée avec CAB dans
`.codex/commands/cab.md`. Elle orchestre l'exploitation du dispositif de
communication entre le broker MCP et l'agent Codex ; elle ne rend aucune
décision d'approbation.

- `/cab start` : vérifie le MCP actif, initialise ou reprend le contrôleur et
  la supervision, puis crée ou réutilise la session de codage persistante ;
- `/cab test` : vérifie le chemin complet de validation dans cette session ;
- `/cab stop` : arrête uniquement les ressources CAB qu'elle a créées, sans
  arrêter OpenCode ni le broker MCP géré par OpenCode.

## 6. Readiness

CAB expose quatre états synthétiques :

- `READY` : fonctionnement nominal ;
- `DEGRADED` : fonctionnement dégradé mais potentiellement récupérable ;
- `BLOCKED` : progression impossible sans résolution du blocage ;
- `HUMAN_REQUIRED` : intervention humaine explicite nécessaire.

## 7. Résilience

CAB est conçu pour supporter les redémarrages, arrêts non propres, validations en attente, notifications interrompues, indisponibilités temporaires du contrôleur, pertes de SSE et tentatives de remédiation interrompues.

La récupération ne doit jamais inventer une décision métier.

## 8. Remédiation

CAB distingue observation, diagnostic, remédiation contrôlée et intervention manuelle.

Les actions automatiques sont désactivées par défaut et doivent être explicitement autorisées. Une remédiation automatique ne peut concerner qu'un état technique déterministe et sans ambiguïté métier.

## 9. Sécurité

CAB applique le moindre privilège, des interfaces locales, l'absence de MCP réseau, des décisions explicites et corrélées, l'absence de secrets dans les journaux, le refus des incohérences ambiguës et la séparation entre supervision, décision et projet piloté.

## 10. Indépendance et distribution

CAB est versionné et distribué indépendamment des projets qu'il pilote.

Il a vocation à être distribué sous forme de dépôt Git source, plugin Codex, skill Codex embarquée et commande `/cab`. Un paquet système ou une image de déploiement pourront être ajoutés lorsqu'ils auront été spécifiés.

## 11. Spécifications OpenSpec

OpenSpec est la source de vérité normative des capacités CAB. La décomposition de référence est la suivante :

- `approval-workflow` : demandes, corrélation et décisions explicites ;
- `approval-persistence` : magasin durable, journal intègre et reprise ;
- `controller-transport` : contrôleur Codex local et contrat HTTP ;
- `supervision-remediation` : readiness, SSE et remédiations contrôlées ;
- `codex-integration-distribution` : plugin Codex, commande d'orchestration
  `/cab` et distribution.

Les spécifications détaillent les comportements attendus ; ce document conserve le cadrage architectural général.

## 12. Évolutivité

CAB peut évoluer vers de nouveaux diagnostics, remédiations contrôlées, mécanismes de supervision, modes de packaging ou intégrations compatibles, tout en conservant la neutralité du broker et la corrélation explicite des décisions.

## 13. Hors périmètre

CAB n'a pas vocation à remplacer OpenCode ou Codex, fournir un système d'authentification, exposer un MCP public, modifier automatiquement le code d'un projet, approuver implicitement une action ou stocker des secrets applicatifs.

## 14. Chaîne de développement

Outils :

* OpenSpec : spécifications ;
* OpenCode : agent de codage ;
* Codex    : orchestrateur ;
* Git local et distant : versionnement ;
* VS Code / Geany : développement ;

Architecture :

```text
                    Développeur
                        │
            interaction / validation
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
         OpenCode               Codex
      Agent de codage        Orchestrateur
             ▲                     │
             └──── Bridge MCP ─────┘
                                   │
                                   ▼
                                  GPT
                     Analyse / Revue / Validation
```

OpenCode reste l'agent de codage du projet.

Codex intervient en analyse, en revue de code, et en validateur.

## 15. Documents complémentaires

- `AGENTS.md` : règles applicables aux agents ;
- `TECHNICAL.md` : fonctionnement technique et configuration ;
- `BUILD.md` : construction, installation, packaging et distribution ;
- `README.md` : présentation publique synthétique ;
- `CHANGELOG.md` : historique des évolutions ;
- `openspec/specs/` : contrats fonctionnels et techniques normatifs.

## 16. Documentation officiel
