# monitor-management Specification

## Purpose
Commander les seules briques CAB locales après contrôle de leur identité et de leur inactivité, et conserver un rangement privé des lignes du moniteur sans modifier les sources, RUN réels ou preuves du projet observé.

## Requirements

### Requirement: Catalogue privé sans mutation du projet observé
Le moniteur MUST conserver ses archives et suppressions logiques dans un catalogue privé distinct du workspace et de l'état opérationnel CAB. Il MUST NOT déplacer, supprimer ou modifier les sources OpenSpec observées, les RUN réels, décisions ou preuves. Les écritures MUST être atomiques, sérialisées et bornées ; liens, contrat invalide et erreur de lecture MUST interdire les mutations sans écrasement silencieux.

#### Scenario: Redémarrage du moniteur
- **WHEN** un RUN et un change sont archivés puis le moniteur redémarre
- **THEN** les archives restent consultables et les sources observées sont intactes

### Requirement: Configuration du catalogue
Le moniteur MUST accepter OC_Codex_MONITOR_STATE_DIR absolu (alias OC_CGPT_) et utiliser par défaut ~/.local/state/cab-approval-bridge-monitor/<sha256-workspace>.

#### Scenario: Répertoire explicite
- **WHEN** un répertoire absolu privé est configuré
- **THEN** seul cet emplacement reçoit le catalogue

### Requirement: Éligibilité contrôlée côté serveur
Les actions archive/delete MUST exiger des observations fraîches et complètes. Un RUN MUST être libéré DELIVERED/ABANDONED ou historique désarmé à gate validé, sans mandat, demande ni activité native courante. Un change MUST être documentairement terminé ou déjà archivé dans OpenSpec et sans RUN non terminal associé. Un état inconnu, une collecte tronquée ou un changement d'éligibilité MUST refuser l'action. L'identité MUST inclure la génération du RUN et l'empreinte documentaire du change.

#### Scenario: Nouvelle génération après archivage
- **WHEN** un RUN archivé est réservé à nouveau avec une nouvelle génération
- **THEN** la nouvelle génération reste visible et l'ancienne reste dans ARCHIVES

#### Scenario: RUN arrêté encore réservé
- **WHEN** un RUN STOPPED possède toujours une réservation active
- **THEN** ses boutons d'archivage et de suppression sont indisponibles et un appel direct est refusé

### Requirement: Actions de présentation restaurables
Chaque ligne admissible MUST présenter Archiver et Supprimer à droite. Supprimer MUST demander confirmation et masquer uniquement l'historique du moniteur. ARCHIVES MUST montrer les RUN et changes archivés par le moniteur et proposer Désarchiver pour chaque RUN. Restaurer MUST rétablir l'affichage sans réarmer ni reprendre un RUN réel.

#### Scenario: Désarchivage d'un RUN
- **WHEN** Désarchiver est activé
- **THEN** le RUN revient dans MONITOR sans requête de reprise métier

### Requirement: Commandes fermées des briques
Les cartes contrôleur, superviseur et broker MUST proposer Démarrer/Arrêter selon l'état et Redémarrer. Web MUST afficher son état et Redémarrer. Les services MUST utiliser uniquement leurs unités systemd utilisateur fixes ; le broker MUST utiliser exclusivement connect/disconnect natifs de cgpt-validation avec workspace explicite. Aucun shell, cible arbitraire, redémarrage d'OpenCode ou activation au login MUST être introduit. 

#### Scenario: Broker arrêté
- **WHEN** Démarrer est activé pour le broker
- **THEN** seule la connexion native MCP est demandée et son résultat est vérifié

### Requirement: Propriété des services
Propriété du service actif, PID et workspace MUST être contrôlés. Un lancement Web manuel MUST signaler le redémarrage indisponible.

#### Scenario: Lancement manuel
- **WHEN** le Web ne correspond pas au MainPID de son unité dédiée
- **THEN** son redémarrage est refusé sans tuer le processus

### Requirement: Quiescence avant action perturbatrice
Arrêt et redémarrage des briques CAB MUST exiger une garde temporaire du contrôleur, acquise après vérification de l'absence de RUN réservé, de job actif, de demande ou effet non résolu et d'activité native. La garde MUST bloquer les mutations concurrentes jusqu'à libération ou expiration. Une action impossible ou échouée MUST être annoncée sans réussite inventée. Le redémarrage Web MUST être indépendant et sa réussite MUST être confirmée après reconnexion par une nouvelle identité de démarrage.

#### Scenario: Réservation concurrente
- **WHEN** une réservation arrive pendant la garde de maintenance
- **THEN** elle est refusée et aucune permission n'est accordée

### Requirement: Routes de gestion protégées et bornées
Les POST de gestion MUST exiger origine identique, Host loopback, JSON, en-tête dédié et champs fermés. Corps, délais et stockage MUST être bornés. Les actions MUST être sérialisées et recontrôlées côté serveur, sans faire confiance aux boutons du navigateur.

#### Scenario: Requête interorigine
- **WHEN** une action provient d'une autre origine
- **THEN** elle est refusée avant toute écriture ou commande
