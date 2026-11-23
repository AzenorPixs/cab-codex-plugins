## MODIFIED Requirements

### Requirement: Compatibilité et protections des anciens connecteurs
CAB MUST détecter les anciens connecteurs et signaler RELOAD_REQUIRED si aucune reprise sûre n'est disponible. Une reprise contrôlée du client MAY utiliser l’autorité bornée de sa demande CABU vérifiée, sans confirmation supplémentaire, avec identité kernel, quiescence, PIDFD et reçu durable. CAB MUST NOT arrêter arbitrairement un client ni injecter des requêtes dans son canal privé. SID/RUN, générations, secrets et reçus MUST rester conservés.

#### Scenario: Ancien connecteur sans interface de rechargement
- **WHEN** un processus déjà chargé n'a ni relais ni interface native accessible
- **THEN** CAB expose la reprise contrôlée nécessaire et son autorité, sans prétendre que son exécution ou sa reconnexion sont prouvées

#### Scenario: Dernier compteur d’un relais dont la sortie est prouvée
- **WHEN** les PIDFD confirment l’arrêt du relais et du moteur de l’instance visée et que le dernier heartbeat est au-delà du délai de récupération
- **AND WHEN** aucun effet non résolu, bail ni signalement explicite d’incertitude ne protège l’instance
- **THEN** CAB peut poursuivre la reprise en conservant au reçu le compteur, les identités et l’absence de résultat confirmé
- **AND THEN** CAB ne réémet pas l’appel et confirme la reconnexion uniquement sur un nouveau heartbeat et le catalogue attendu

#### Scenario: Le backend du relais descend d’un sous-processus de Codex
- **WHEN** le backend de remplacement est rattaché à un sous-processus direct de l’instance graphique vérifiée
- **THEN** CAB peut confirmer cette filiation si le sous-processus est du même UID, utilise le même exécutable de confiance et conserve la même identité noyau
- **AND THEN** CAB attend le heartbeat et le catalogue du relais avant de confirmer la reprise
