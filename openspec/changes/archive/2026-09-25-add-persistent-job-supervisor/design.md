# Design

## Context

Voir `proposal.md`. Le contrôleur est un service utilisateur local qui expose
un état éphémère et consomme le SSE OpenCode. Son gate terminal est remis à
zéro à la prochaine validation et ne survit donc ni à un redémarrage ni à une
fin de tour conversationnel. Le broker conserve déjà ses propres approbations
dans `.opencode/state`; cette évolution ne doit ni les modifier ni interpréter
leurs décisions.

## Goals / Non-Goals

**Goals:**

- Conserver un unique contrat de job par workspace dans
  `.opencode/state/cgpt-approval-bridge/`, écrit par remplacement atomique.
- Faire du contrôleur l'API locale du contrat et du superviseur un processus
  utilisateur séparé qui observe l'API, le SSE et la session OpenCode.
- Adresser les reprises à l'identifiant de session déjà enregistré, avec une
  échéance de 60 secondes configurable et une exclusivité de tentative.
- Rendre l'état directement consultable dans la console par des endpoints
  locaux et le journal systemd utilisateur.

**Non-Goals:**

- Décider, créer, consommer ou modifier une approbation CAB.
- Lire un fichier, une configuration ou un secret du projet suivi.
- Créer une session de remplacement, modifier le fournisseur, le modèle ou le
  raisonnement OpenCode, ni forcer l'arrêt d'un agent.
- Garantir la reprise si la session OpenCode enregistrée a été supprimée : cet
  état reste observable et exige une intervention explicite.

## Decisions

### Contrat possédé par le contrôleur, observé par le superviseur

Le contrôleur ajoute un magasin `controller-job.json` à côté de ses rappels et
les endpoints locaux `POST /job/arm`, `POST /job/progress`, `POST /job/disarm`
et `GET /job`. Le contrat est validé avant écriture, contient seulement des
métadonnées non secrètes et est écrit par fichier temporaire puis renommage.
Le gate terminal actuel est persisté dans ce contrat lorsqu'un job est armé.
Le contrôleur reste ainsi la source de vérité du gate qu'il valide ; le
superviseur ne peut pas le forger. Une unique session est immuable durant la
vie d'un job.

L'alternative d'un fichier dans `output/` du projet piloté est rejetée : CAB
doit fonctionner pour tout workspace sans écrire ses artefacts dans les
sources ou la zone de sortie du projet. L'alternative d'un magasin global est
rejetée car elle rendrait la séparation entre workspaces ambiguë.

### Superviseur système distinct et local

Un script Node.js distribué, lancé par une unité systemd utilisateur dédiée,
écoute `/global/event`, réconcilie périodiquement l'API OpenCode et lit le
contrat par `GET /job` du contrôleur. Il publie `GET /status` uniquement sur
loopback. Son état interne persistant enregistre les temps observés et la
dernière tentative afin que le redémarrage systemd ne réinitialise pas le
délai ni ne duplique une reprise.

Cette séparation limite le contrôleur aux transports de validation et évite
qu'un watchdog de disponibilité devienne un décideur. Intégrer la boucle au
contrôleur a été écarté : une panne de l'App Server ne doit pas empêcher
l'observabilité indépendante de la reprise.

### Détection prudente et message de reprise idempotent

Le superviseur considère une reprise nécessaire seulement si le job est armé,
que le gate est ouvert, qu'aucune relance n'est en cours et qu'il a observé la
fin du tour de la session ou une absence d'activité au-delà de l'échéance.
Avant le `POST /session/<id>/message`, il vérifie que la session existe, que le
contrôleur indique SSE `connected` et que la readiness CAB est `READY` ou
`DEGRADED` sans approbation en attente. En cas d'échec, il enregistre une
raison et un délai de nouvelle vérification ; il ne substitue jamais une
nouvelle session.

Le message de reprise est fixe et structuré : il rappelle le job, exige de
relire l'état persistant, d'examiner SSE/CAB et de poursuivre le premier jalon
non prouvé, sans réponse finale tant que le gate est ouvert. Une tentative est
marquée avant l'envoi et accusée seulement après la réponse HTTP ; un
redémarrage la laisse donc visible et empêche un doublon immédiat.

### Cycle de vie et versions

`/cab start` installe le script et l'unité du superviseur avec les ressources
existantes, les démarre explicitement après le contrôleur, puis vérifie son
endpoint local. `/cab run` arme ou actualise le contrat avant de transmettre
le premier mandat. `/cab stop` consulte le contrat et refuse l'arrêt normal si
le gate n'est pas validé ; il arrête d'abord le superviseur. L'unité utilise
`Restart=on-failure` sans section `[Install]`.

Le broker Python, le contrôleur et le nouveau superviseur annoncent `0.85.0`.
Le manifeste et la commande `/cab` portent la même version de base ; le
cachebuster du manifeste est régénéré selon la convention existante.

## Risks / Trade-offs

- [Le schéma SSE varie] → la relance ne repose pas exclusivement sur son
  contenu : une réconciliation HTTP et la vérification de session restent
  obligatoires.
- [OpenCode est indisponible] → aucune reprise n'est envoyée, la cause est
  conservée et systemd peut relancer le superviseur seulement après un échec
  technique.
- [Un job légitime est silencieux plus de 60 secondes] → la présence d'un tour
  encore actif ou d'une tentative en cours bloque la reprise ; l'échéance est
  configurable sans modifier le contrat.
- [Le contrôleur est arrêté manuellement] → le superviseur conserve son état
  non terminal et le signale ; il ne démarre jamais le contrôleur de lui-même.

## Migration Plan

1. Installer les nouveaux artefacts avec `/cab start` ; aucun contrat n'est
   créé tant que `/cab run` n'arme pas un job.
2. Les installations existantes sans fichier de contrat démarrent avec l'état
   `UNARMED` et conservent leur comportement actuel.
3. En retour arrière, arrêter explicitement le superviseur puis retirer ses
   ressources distribuées ; les fichiers d'état restent inertes et peuvent
   être ignorés par une version antérieure.
