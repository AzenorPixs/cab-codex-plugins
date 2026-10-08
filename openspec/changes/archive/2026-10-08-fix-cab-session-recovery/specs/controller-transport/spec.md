## MODIFIED Requirements

### Requirement: Contrat de supervision de job local

Le contrôleur SHALL accepter et exposer exclusivement sur son interface locale
un contrat de supervision de job non secret, corrélé à une session OpenCode et
à son gate terminal. Il SHALL refuser un contrat incomplet, une substitution implicite de session
sur /job/arm, ou une désactivation sans gate terminal validé. Seule la
récupération explicite /job/recover définie ci-dessous MAY remplacer la session. Son statut public SHALL résumer le job armé et son gate sans exposer le
contenu du projet ni une décision CAB.
Le champ facultatif `strictCommands` SHALL être booléen, valoir `false` par
défaut et être conservé dans le contrat persistant et son état public. Le
contrôleur SHALL refuser toute autre valeur avant d'armer le job.

#### Scenario: Tentative de désarmement prématuré

- **WHEN** un client demande le désarmement d'un job dont le gate terminal est
  ouvert
- **THEN** le contrôleur refuse la demande et conserve le contrat observable

#### Scenario: Type invalide pour la corrélation stricte
- **WHEN** un client arme un job avec une valeur non booléenne de
  `strictCommands`
- **THEN** le contrôleur refuse le contrat et ne l'arme pas

## ADDED Requirements

### Requirement: Interface explicite de récupération
POST /job/recover MUST accepter prepare et complete, corrélés par jobId, expectedSessionId, sessionId, recoveryId et preflightRequestId uniques. Le contrôleur MUST refuser les mutations concurrentes pendant la transition. Il MUST NOT désarmer le job, purger le RUN, fabriquer une décision ou valider le gate pour ce remplacement.

#### Scenario: Transition concurrente
- **WHEN** une mutation est demandée pendant un contrôle asynchrone de récupération
- **THEN** elle est refusée sans modifier le contrat

### Requirement: Préconditions techniques de récupération
prepare et complete MUST vérifier un job armé avec gate OPEN, mandat courant clôturé, aucune demande indécise, aucun rappel, aucune permission native ni transmission en cours. Via OpenCode dans directory, ils MUST vérifier santé, chemin, MCP connecté et les deux sessions inactives dans cette racine. Un contrôle indisponible ou divergent MUST refuser la transition.

#### Scenario: Précondition manquante
- **WHEN** une permission, une session occupée, une demande indécise ou un contexte divergent est observé
- **THEN** la transition est refusée sans transfert ni approbation implicite

### Requirement: Gel et persistance de récupération
prepare MUST persister un gel observable sans contenu de projet ni secret et invalider les autorisations exécutables de l'ancienne session sans modifier les décisions historiques. Le gel et les sessions révoquées MUST survivre à un redémarrage. Un échec de complete MUST conserver le gel.

#### Scenario: Redémarrage pendant une récupération
- **WHEN** le contrôleur redémarre après prepare et avant complete
- **THEN** le gel est restauré et aucune ancienne autorisation n'est exécutée

### Requirement: Prévol natif avant transfert
complete MUST exiger une décision locale approved, une réponse MCP APPROVED corrélée au preflightRequestId réservé, une unique permission /usr/bin/true consommée et une commande exacte terminée exit 0. Les messages natifs OpenCode MUST ensuite prouver broker_readiness READY pending_count 0. Une affirmation du client, une preuve absente ou divergente, ou un autre outil natif exécuté MUST refuser le transfert.

#### Scenario: Polling corrélé après délai MCP
- **WHEN** request_validation expire côté client et poll_approval ou get_approval retourne une réponse APPROVED réellement corrélée avant la commande
- **THEN** complete MAY accepter cette réponse native après vérification de toutes les autres preuves

#### Scenario: Prévol non prouvé
- **WHEN** le client affirme une réussite mais les messages natifs ne la prouvent pas
- **THEN** complete refuse le transfert et conserve le gel

### Requirement: Conservation du même job
Après complete, le contrôleur MUST conserver jobId, directory, changeId, criteria, lastProvenMilestone et strictCommands, remplacer uniquement la session, persister l'historique non secret des récupérations et conserver gate OPEN. Les sessions révoquées MUST rester sans permission exécutable même après désarmement.

#### Scenario: Transfert prouvé
- **WHEN** les préconditions et le prévol sont prouvés
- **THEN** complete remplace la session et conserve le périmètre, le dernier jalon et le gate OPEN

### Requirement: Session admise pour les validations
Pour un job armé, le contrôleur MUST refuser toute nouvelle validation dont la session ou directory diverge du contrat. Pendant la récupération, il MUST admettre uniquement le preflightRequestId réservé, files vide et commands contenant /usr/bin/true seul, dans la session candidate et directory du job.

#### Scenario: Mauvaise session
- **WHEN** une demande vise une session ou un répertoire non admis
- **THEN** le contrôleur refuse la validation sans décision ni permission

### Requirement: Prévol strict et autorisations invalidées
La commande réservée MUST être corrélée exactement sans suffixe, quelle que soit strictCommands, et nécessiter une décision explicite unique. Une décision consommée ou invalidée MUST NOT répondre once de nouveau ; la décision historique MUST rester inchangée.

#### Scenario: Suffixe ou ancienne décision
- **WHEN** une permission ajoute un suffixe au prévol ou vise une autorisation invalidée de l'ancienne session
- **THEN** aucune permission once n'est transmise
