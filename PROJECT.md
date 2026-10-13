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

### 3.3 Orchestrateur validateur

Codex est l’orchestrateur de la session de codage persistante. Il la pilote du
démarrage jusqu’à son état terminal : il confie les mandats, examine leurs
résultats, décide de la poursuite, de la correction, du refus ou de la
suspension, puis prononce la clôture.

Toute opération nécessitant une permission OpenCode est un mandat unitaire
soumis à sa décision explicite et corrélée : édition, commande Bash ou système,
commande OpenSpec, test à effet de bord, correction ou archivage OpenSpec.
L’agent de codage exécute les mandats approuvés sans décider lui-même de leur
validité ni d’un élargissement de périmètre. Un archivage OpenSpec reste un
mandat distinct, décidé seulement après vérification des critères d’acceptation,
des validations et de la cohérence finale.

Le protocole impose le SSE en temps réel et le contrôle des demandes et
rapports toutes les 3 secondes. Les vérifications de progression pendant
l'analyse ou la rédaction sont espacées de 7 secondes fixes. Un benchmark
PLLM échoué est retenté toutes les 30 minutes, sans limite, dans le même RUN
jusqu'à reprise sûre ou arrêt explicite ; cet échec seul ne termine pas le RUN.
Les sondes statistiques suivent une cadence de 30 minutes sans arrêter le
travail pour attendre l'échéance. `AGENTS.md` et le skill distribué précisent
les contrôles et preuves exigés avant reprise.

### 3.4 Corrélation explicite

Chaque demande est corrélée par un `requestId` stable. Une décision doit correspondre à la demande exacte qui l'a provoquée. Une décision déjà consommée ne doit pas pouvoir être remplacée par une décision contradictoire.

### 3.5 Persistance et traçabilité

CAB conserve l'état courant des approbations, leur historique, les éléments nécessaires à la reprise après interruption et les informations de diagnostic.

Cette persistance couvre le RUN courant et sa reprise. Une réinitialisation globale exclusive
CAB purge d'abord l'intégralité de son ancien état technique, y compris les
conflits Syncthing, puis réinitialise le broker et la supervision. Les rapports
et historiques natifs des agents sont conservés hors de cet espace runtime.

### 3.6 Supervision indépendante

CAB distingue disponibilité des processus, activité des transports et progression métier réelle. Un processus vivant ou un échange réseau actif ne suffit pas à déclarer le système sain.

## 4. Architecture fonctionnelle

```text
OpenCode unique : sessions A, B, … — un RUN par session
   │ MCP stdio commun
   ▼
Broker CAB unique — corrélation et readiness par RUN
   │ HTTP local
   ▼
Contrôleur unique ──► contextes A, B, … ──► Codex / Codex App Server
   │
   └── Registre : réservations exclusives et intégration coordonnée

OpenCode ── SSE HTTP commun ──► superviseur unique ──► suivi par RUN
```

Le transport entre OpenCode et le broker est exclusivement **MCP stdio local**. Le broker n'expose pas de serveur MCP réseau.

### 4.1 Architecture technique détaillée

Cette vue détaille le profil concurrent CAB 1.0.0 : un processus OpenCode,
un broker MCP stdio, un contrôleur et un superviseur communs, avec des
contextes isolés par RUN. A et B illustrent deux sessions ; le même modèle
s'applique aux autres RUN admis. Les contextes et la barrière sont des
éléments internes, pas des services supplémentaires.

```mermaid
flowchart TB
    D["Développeur"]
    C["Codex — orchestrateur / validateur<br/>Pilotage et décisions corrélés par RUN"]

    subgraph OC["Un processus OpenCode — répertoire commun"]
        subgraph RUN1["Session A — RUN A — change réservé A"]
            O1["Agent de codage A"]
            P1["Permission native A<br/>une opération : once"]
            X1["Exécution A<br/>rapport et preuves"]
            O1 -->|"Demande de permission"| P1
            P1 -->|"Autorisation unique"| X1
            X1 -->|"Résultat"| O1
        end
        subgraph RUN2["Session B — RUN B — change réservé B"]
            O2["Agent de codage B"]
            P2["Permission native B<br/>une opération : once"]
            X2["Exécution B<br/>rapport et preuves"]
            O2 -->|"Demande de permission"| P2
            P2 -->|"Autorisation unique"| X2
            X2 -->|"Résultat"| O2
        end
        M["Connexion MCP stdio commune<br/>demandes identifiées par RUN et session"]
        F["Flux SSE commun<br/>événements natifs par session"]
        O1 <--> M
        O2 <--> M
        O1 -.-> F
        O2 -.-> F
    end

    subgraph CAB["Infrastructure CAB 1.0.0 partagée"]
        B["Un broker MCP local<br/>corrélation et readiness par RUN / session"]
        E[("Approbations persistantes<br/>journal et intégrité")]
        subgraph CTRL["Un contrôleur Codex — API HTTP locale"]
            T["Routage et contrôle d'identité<br/>session, répertoire, RUN, change, génération"]
            R[("Registre durable des réservations<br/>changes, intentions, ressources, dépendances<br/>écriture atomique et verrou flock")]
            I["Barrière d'intégration exclusive<br/>jalons stables et quiescence de tous les RUN<br/>publication puis réconciliation de référence"]
            T1["Contexte RUN A<br/>décisions, mandats, gate, récupération"]
            T2["Contexte RUN B<br/>décisions, mandats, gate, récupération"]
            T <-->|"Réserver, étendre, vérifier, libérer"| R
            R <-->|"Propriétaire et version de référence"| I
            T <-->|"Routes /runs/A/..."| T1
            T <-->|"Routes /runs/B/..."| T2
        end
        subgraph SUP["Un superviseur durable"]
            S["Répartition des événements SSE"]
            S1["Suivi et reprise RUN A"]
            S2["Suivi et reprise RUN B"]
            S --> S1
            S --> S2
        end
        J1[("États persistants RUN A<br/>job, jalons, gate et supervision")]
        J2[("États persistants RUN B<br/>job, jalons, gate et supervision")]
        B <-->|"Persistance"| E
        B <-->|"HTTP : demande et décision corrélées"| T
        T1 <-->|"Persistance"| J1
        T2 <-->|"Persistance"| J2
        S1 <-->|"Persistance"| J1
        S2 <-->|"Persistance"| J2
        S1 <-->|"HTTP : statut, progression, gate"| T
        S2 <-->|"HTTP : statut, progression, gate"| T
    end

    A["Codex App Server — mode automatique<br/>validation isolée et corrélée par RUN"]
    W[("Répertoire de projet partagé<br/>opérations limitées aux ressources réservées")]

    D -->|"Objectifs, périmètres et validations"| C
    C <-->|"HTTP : registre et pilotage par RUN"| T
    C -->|"Mode manuel par défaut : décision explicite"| T
    M <-->|"MCP stdio local"| B
    F -.->|"SSE HTTP direct"| T
    F -.->|"SSE HTTP direct"| S
    S1 -.->|"Reprise de la session A si admissible"| O1
    S2 -.->|"Reprise de la session B si admissible"| O2
    T1 -->|"approved corrélé : once pour A"| P1
    T2 -->|"approved corrélé : once pour B"| P2
    T1 -.->|"Demande de validation automatique"| A
    T2 -.->|"Demande de validation automatique"| A
    A -.->|"Décision structurée corrélée"| T
    X1 -->|"Ressources couvertes par A"| W
    X2 -->|"Ressources couvertes par B"| W
```

- **Un mandat = une opération** : un fichier ou une commande, avec
  corrélation de `requestId`, `approval_id`, `change_id`, `run_id`,
  `reservation_version`, de la session et du répertoire.
- Le broker transporte et persiste ; **Codex décide**. Le contrôleur transmet
  l'approbation à la permission native correspondante avec une réponse
  `once`, consommable une seule fois.
- Les événements SSE et les relances techniques ne donnent aucune
  autorisation. Une décision absente ne vaut jamais approbation.
- Le gate terminal contrôle la clôture du job ; il reste distinct des
  décisions unitaires et ne remplace pas une permission OpenCode.
- Le mode manuel, utilisé par défaut, attend une décision HTTP explicite de
  l'orchestrateur sur `POST /decision/<requestId>`. Le mode automatique
  sollicite une session Codex de validation via Codex App Server.
- Le broker notifie le contrôleur sur `POST /validation/request` et récupère
  la décision sur `GET /decision/<requestId>`. La readiness est publiée
  séparément ; `READY` ne vaut jamais approbation.
- Avant de travailler, chaque RUN réserve atomiquement son change, son
  intention de sélection et ses ressources, après examen des dépendances.
  Les lectures peuvent coexister ; un recouvrement impliquant une écriture
  est refusé. Codex examine aussi les dépendances sémantiques.
- Le contrôleur vérifie la couverture de chaque mandat et sa génération
  avant de transmettre `once` à la permission native de la bonne session.
  Les décisions, gates, reprises et checkpoints restent propres au RUN.
- L'intégration attend des jalons stables et la quiescence de tous les RUN
  réservés. Un seul RUN contrôle et publie l'état combiné ; les autres
  suspendent leurs opérations puis réconcilient la nouvelle référence.
  Une libération exige les contrôles et preuves applicables.
- Ajouter un RUN ne purge ni ne reconnecte le broker. Les opérations
  globales de cycle de vie exigent une réconciliation coordonnée.

Les cylindres représentent les états persistants des composants, sans
imposer un fichier ou un emplacement partagé. Les flèches en pointillés
identifient les voies SSE, les reprises techniques et le chemin de décision
du mode automatique. La publication désigne l'intégration dans la référence
commune du projet ; elle n'autorise pas un commit ou un déploiement.

## 5. Composants

### 5.1 Broker MCP

Le broker constitue le cœur de CAB. Il gère les validations, la corrélation, la persistance, le journal, les expirations, la reprise, la readiness, le diagnostic et les remédiations techniques contrôlées.

### 5.2 Contrôleur Codex

Le contrôleur reçoit les demandes du broker, sollicite Codex dans un contexte de validation dédié et rend les décisions disponibles au broker. Il ne remplace pas le broker et ne modifie pas le projet suivi.

Après une décision explicite `approved`, il transmet uniquement cette décision
à l’unique permission native OpenCode corrélée, puis la considère consommée.
Il ne peut jamais transformer un objectif de job ou une liste de fichiers et de
commandes en approbation générale.

### 5.3 Supervision

CAB observe OpenCode par une voie SSE directe indépendante du cycle MCP. Cette voie sert à confirmer l'activité réelle et à réconcilier l'état après reconnexion ou divergence.

### 5.4 Plugin Codex

Le plugin regroupe les skills `approval-bridge` et `coding-session-statistics`, les scripts du contrôleur et de supervision ainsi que les métadonnées nécessaires à son intégration Codex. Sa marketplace est versionnée à la racine du dépôt dans `.agents/plugins/marketplace.json` et le plugin dans `plugins/cab-approval-bridge/`.

L'orchestrateur prépare la collecte dès le début de chaque change. Après
chaque archivage OpenSpec autorisé et réussi, il fait produire et vérifier
`STATISTIQUES.md` dans le dossier d'archive avant la clôture normale. Un lot
exige un rapport par archive. Les mesures absentes restent `N/A` motivées ;
une publication échouée laisse le cycle incomplet, sans réarchivage.

### 5.5 Commande `/cab`

`/cab` est une commande destinée à l'agent Codex et versionnée avec CAB dans
`.codex/commands/cab.md`. Elle orchestre l'exploitation du dispositif de
communication entre le broker MCP et l'agent Codex ; elle ne rend aucune
décision d'approbation.

- `/cab start` : purge l'ancien état technique après contrôle d'inactivité,
  vérifie le MCP actif, initialise la supervision et crée une nouvelle session
  maîtresse ; la reprise ordinaire conserve son état et sa session, sauf
  remplacement vérifié par `/job/recover`. Un prévol divergent conserve sa
  candidate et le runtime selon la section 7 ;
- `/cab test` : vérifie le chemin complet de validation dans cette session ;
- `/cab run` : maintient le job piloté et ses mandats unitaires dans cette
  même session, sauf récupération explicite contrôlée conservant le RUN ;
- `/cab update` : actualise séparément le plugin CAB depuis sa marketplace,
  installe ou actualise le superviseur local sans le démarrer, puis actualise
  la commande de profil depuis `AzenorPixs/cab-codex-plugins`, seulement
  lorsqu'une version strictement plus récente est disponible ;
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

La récupération ne doit jamais inventer une décision métier. L'orchestrateur
peut demander au contrôleur un remplacement explicite de session dans le même
job après gel, réconciliation technique et prévol natif prouvé. Le périmètre,
les critères et le dernier jalon sont conservés ; les anciennes autorisations
exécutables sont invalidées. Le superviseur ne crée pas la nouvelle session.
Après un prévol de récupération divergent ou incomplet refusé sans effet,
l'orchestrateur conserve sa candidate, le job et le runtime sans renouvellement
ni purge. Il réconcilie les demandes, permissions et preuves avant retry
explicite dans /job/recover, avec requête et approbation neuves. Le contrôleur
conserve le gel jusqu'au prévol exact et complete prouvé ; les preuves
historiques restent intactes et aucun travail validé n'est rejoué. Un délai
MCP seul conserve le polling de la même approbation. Effet inconnu ou preuve
manquante suspend la reprise ; OpenCode reste ouvert.

Les mandats lecture seule désactivent les outils natifs et d'écriture via
l'API de messagerie, plutôt que de dépendre du seul texte du mandat.

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
- `persistent-job-supervision` : contrat durable, gate terminal et reprise
  corrélée de la session ;
- `codex-integration-distribution` : plugin Codex, commande d'orchestration
  `/cab` et distribution.
- `archive-session-statistics` : collecte auditable et rapport obligatoire
  après chaque archivage OpenSpec réussi.

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

## Pilotage concurrent 1.0.0

Le profil concurrent partage un OpenCode, un broker MCP stdio et un contexte
absolu de projet. Plusieurs RUN possèdent chacun leur session, contrat,
permissions et preuves. Un registre technique réserve atomiquement changes,
intentions et ressources ; Codex examine les dépendances et conserve l'autorité
de décision. Une réservation ne vaut jamais approbation.

Le même RUN peut enchaîner des changes après libération prouvée, avec une
nouvelle session et une génération fraîche. L'intégration commune est exclusive.
Le cycle parent reste en attente si le travail restant dépend d'un autre RUN.
Le démarrage d'un RUN rejoint l'infrastructure sans purge. Les procédures de
purge et d'arrêt communes décrites ailleurs s'appliquent seulement à une
réinitialisation globale exclusive, après quiescence et réconciliation.

La capacité OpenSpec concurrent-run-coordination définit ces garanties.
Le protocole détaillé est dans ORCHESTRATED_CODING.md. Les worktrees ne font
pas partie du profil concurrent initial. Les prompts directs ne sont pas
exécutés en concurrence avec ces RUN et ne sont pas modifiés par cette évolution.
