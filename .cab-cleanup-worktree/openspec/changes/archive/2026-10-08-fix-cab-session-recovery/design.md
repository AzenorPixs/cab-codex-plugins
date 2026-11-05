# Design

## Context
Le contrat courant refuse un changement implicite de session sur /job/arm. Cette protection reste en place. La nouvelle interface /job/recover autorise seulement une récupération explicite du même job.

## Decisions
- Deux phases prepare et complete portent jobId, expectedSessionId, sessionId, recoveryId et preflightRequestId. Le répertoire est celui du contrat ; chaque accès OpenCode reçoit directory.
- prepare exige un job armé, un gate OPEN, un mandat courant clôturé, aucune demande indécise, permission native ou transmission en cours, et les deux sessions inactives dans le même contexte sain/MCP connected. Les identifiants sont uniques. Les mandats exécutables de l'ancienne session sont invalidés sans remplacer leurs décisions. La récupération est persistée et interdit toute relance métier.
- Pendant la récupération, seule la commande exacte /usr/bin/true de la session candidate avec le preflightRequestId réservé est admise. Elle requiert une décision explicite indépendante.
- complete exige la consommation unique de cette permission et les preuves natives OpenCode : request_validation APPROVED corrélée, commande exacte terminée avec exit 0 et broker_readiness READY pending_count 0 postérieure à l'exécution, sans autre outil natif exécuté. Une affirmation fournie par le client ne vaut pas preuve.
- Le remplacement conserve le job, le change, les critères, strictCommands et le dernier jalon. Un historique non secret et les sessions révoquées sont persistés ; gate OPEN. Les anciennes décisions restent consultables mais ne peuvent plus transmettre once.
- Un verrou local empêche les mutations concurrentes pendant les contrôles asynchrones et la persistance. Un échec conserve le gel et une cause statique. Aucune purge ni substitution implicite ni décision automatique de récupération.
- Le superviseur attend pendant la récupération et suit la nouvelle session seulement après complete. L'orchestrateur désactive Bash, edit, write, apply_patch, task et skill pendant un mandat lecture seule ; les outils de lecture/recherche restent disponibles.

## Risks / Migration
L'interface est additive. Les jobs sans récupération conservent leurs comportements ; /job/arm reste immuable. Les anciennes sessions d'un job récupéré sont interdites même après désarmement. Aucun changement de version ni release publié dans ce correctif source. Une installation antérieure ne contient pas la nouvelle API ; son déploiement reste distinct.

## Validation
Tests Node HTTP avec OpenCode/Codex simulés : préconditions négatives, prévol corrélé, transfert et redémarrage, conservation des jalons, demandes d'ancienne/mauvaise session, suffixes, consommation unique, concurrence et gel du superviseur. Suites Node/Python existantes, syntaxe, OpenSpec strict, revue UTF-8/LF et documentation. Aucun service réel manipulé.

Le prévol admet un polling MCP corrélé après délai de request_validation ; la réponse APPROVED réelle, l’exécution unique et la readiness finale restent requises.
