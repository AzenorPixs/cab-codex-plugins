## MODIFIED Requirements

### Requirement: Identité locale du serveur suivi
CAB MUST suivre l'identité du serveur OpenCode via son API authentifiée et son starttime local. Si l'instance disparaît, CAB MUST suspendre les effets concernés et rechercher une nouvelle instance sans fermer les services. CAB MUST NOT adopter une instance tant que l'ancienne existe ou que l'identité, le workspace ou les sessions ne sont pas vérifiables. Une panne HTTP ou SSE seule MUST NOT prouver une disparition.

#### Scenario: Serveur disparu
- **WHEN** l'instance suivie disparaît et qu'une nouvelle instance est vérifiée avec le même workspace et les sessions attendues
- **THEN** CAB rétablit la communication et réconcilie les protections sans rejouer d'effet

#### Scenario: Réutilisation du PID
- **WHEN** le même PID existe avec un autre starttime
- **THEN** CAB considère l'ancienne instance disparue et vérifie la nouvelle avant adoption

#### Scenario: Panne de transport ou fermeture du client
- **WHEN** HTTP ou SSE tombe alors que le serveur identifié vit encore
- **THEN** CAB ne conclut pas à un redémarrage

#### Scenario: Démarrage avant OpenCode
- **WHEN** aucun serveur vérifiable n'a encore été observé
- **THEN** CAB attend sa première instance vérifiable

#### Scenario: Identité illisible
- **WHEN** l'identité de l'ancien ou du nouveau processus ne peut pas être établie
- **THEN** CAB maintient les protections et un diagnostic sans adopter la nouvelle instance

### Requirement: Arrêt technique idempotent et borné
Sur demande explicite d'arrêt ou signal système, CAB MUST arrêter admissions, minuteries, reconnexions, SSE et HTTP, terminer ses écritures et libérer le helper dans le délai prévu. L'arrêt MUST être idempotent. Un nettoyage incomplet MUST signaler l'échec ; le broker MUST rester géré par OpenCode.

#### Scenario: Fermeture simultanée et signal
- **WHEN** un signal d'arrêt est reçu pendant une attente de reconnexion
- **THEN** un seul nettoyage technique s'exécute et aucun nouveau travail n'est lancé

#### Scenario: Nettoyage incomplet
- **WHEN** une ressource ne se ferme pas dans le délai de nettoyage
- **THEN** un diagnostic et un statut d'échec sont produits

#### Scenario: Persistance technique impossible
- **WHEN** les statistiques ne peuvent pas être sauvegardées à l'arrêt
- **THEN** CAB libère son helper et signale un échec

#### Scenario: App Server enfant
- **WHEN** le contrôleur ferme un contexte possédant son App Server
- **THEN** il attend aussi la sortie de cet enfant avant de terminer
