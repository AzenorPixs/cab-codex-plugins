## ADDED Requirements

### Requirement: Autorisation de reprise nécessaire à CABU
Une demande CABU authentifiée MUST autoriser les reprises nécessaires de son instance observée, pour son UID et sa version, sans confirmation supplémentaire. Le service MUST conserver ce périmètre et sa provenance dans le reçu. Une autorisation révoquée, une instance divergente ou un effet incertain MUST bloquer la reprise sans rejeu. L’autorisation MUST NOT prouver la disponibilité technique ni la reconnexion.

#### Scenario: Reprise dans la mise à jour autorisée
- **WHEN** le paquet est vérifié et la même instance atteint une frontière sûre
- **THEN** CAB admet sa reprise nécessaire sans nouvelle confirmation et conserve un reçu corrélé

#### Scenario: Révocation avant dispatch
- **WHEN** le demandeur révoque cabu_recovery_authorized avant une reprise en attente
- **THEN** CAB bloque son dispatch sans changer la génération fournisseur ni rejouer un effet

#### Scenario: Ancien reçu ou instance étrangère
- **WHEN** le reçu ne porte pas d’instance observée ou la cible diffère
- **THEN** CAB expose le motif technique sans inventer d’autorisation ni demander une confirmation répétitive

## MODIFIED Requirements

### Requirement: Compatibilité et protections des anciens connecteurs
CAB MUST détecter les anciens connecteurs et signaler RELOAD_REQUIRED si aucune reprise sûre n'est disponible. Une reprise contrôlée du client MAY utiliser l’autorité bornée de sa demande CABU vérifiée, sans confirmation supplémentaire, avec identité kernel, quiescence, PIDFD et reçu durable. CAB MUST NOT arrêter arbitrairement un client ni injecter des requêtes dans son canal privé. SID/RUN, générations, secrets et reçus MUST rester conservés.

#### Scenario: Ancien connecteur sans interface de rechargement
- **WHEN** un processus déjà chargé n'a ni relais ni interface native accessible
- **THEN** CAB expose la reprise contrôlée nécessaire et son autorité, sans prétendre que son exécution ou sa reconnexion sont prouvées
