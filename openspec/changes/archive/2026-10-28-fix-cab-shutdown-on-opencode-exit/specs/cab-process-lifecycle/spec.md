## ADDED Requirements

### Requirement: Identité locale du serveur suivi
CAB MUST suivre le PID obtenu par /api/info authentifié et son starttime local, sans lire commande, environnement ou secrets. Avant rattachement, une identité absente ou non vérifiable MUST laisser CAB en attente avec diagnostic. Après rattachement, absence, zombie ou starttime différent MUST établir la fin de l’instance. CAB MUST NOT adopter un autre serveur ni conclure à une fermeture sur une seule panne HTTP/SSE.

#### Scenario: Serveur disparu
- **WHEN** l’instance serveur préalablement identifiée disparaît
- **THEN** les trois services commencent leur arrêt technique

#### Scenario: Réutilisation du PID
- **WHEN** le PID existe avec un autre starttime
- **THEN** CAB termine son rattachement ancien sans suivre le nouveau processus

#### Scenario: Panne de transport ou fermeture du client
- **WHEN** HTTP ou SSE tombe ou le client terminal ferme mais le serveur identifié vit encore
- **THEN** CAB reste disponible sans conclure à la fermeture du serveur

#### Scenario: Démarrage avant OpenCode
- **WHEN** aucun serveur vérifiable n’a encore été observé
- **THEN** CAB attend et peut se rattacher à sa première instance vérifiable

#### Scenario: Identité illisible
- **WHEN** la lecture locale échoue hors absence prouvée
- **THEN** CAB publie un diagnostic filtré sans fermer sur cette seule erreur

### Requirement: Arrêt technique idempotent et borné
Après disparition prouvée du serveur, CAB MUST arrêter admissions, minuteries, reconnexions, SSE et HTTP, terminer ses écritures techniques et libérer le helper en moins de cinq secondes dans le banc contrôlé. L’arrêt MUST être idempotent, sans cible étrangère. Un succès MUST sortir normalement ; un nettoyage incomplet MUST signaler l’échec sans relance systemd. Le broker MUST rester géré par OpenCode.

#### Scenario: Fermeture simultanée et signal
- **WHEN** la disparition du serveur et un signal d’arrêt arrivent ensemble
- **THEN** un seul nettoyage s’exécute et aucun nouveau travail n’est lancé

#### Scenario: Nettoyage incomplet
- **WHEN** une ressource ne se ferme pas dans le délai de nettoyage
- **THEN** un diagnostic et un statut d’échec sans redémarrage automatique sont produits

#### Scenario: Persistance technique impossible
- **WHEN** les statistiques ne peuvent pas être sauvegardées à la fermeture
- **THEN** le contrôleur libère son helper et signale un nettoyage incomplet sans sortie de succès ni relance automatique

#### Scenario: App Server enfant
- **WHEN** le contrôleur ferme un contexte possédant son App Server
- **THEN** il attend aussi la sortie de cet enfant avant de terminer avec succès
