## MODIFIED Requirements

### Requirement: Journal vérifiable
CAB SHALL consigner les transitions métier dans un journal append-only chaîné
par SHA-256. Avec un checkpoint HMAC configuré, CAB SHALL vérifier son intégrité
sans exposer la clé. La seule exception de réécriture ciblée SHALL être
l’effacement terminal qualifié selon change-state-erasure, avec réancrage
satisfaisant les garanties ci-dessous.

#### Scenario: Intégrité du journal invalide
- **WHEN** le journal ou son checkpoint ne passe pas les vérifications d’intégrité
- **THEN** CAB signale une cause de santé non saine et ne prétend pas que l’état est fiable

#### Scenario: Réancrage après clôture et nettoyage natif
- **WHEN** un effacement terminal qualifié retire les événements du change cible
- **THEN** CAB vérifie le journal avant la réécriture et le journal rescellé après celle-ci
- **AND** les événements des autres RUN conservent leur contenu métier et leurs identités
- **AND** aucune copie ou empreinte propre aux événements retirés n’est conservée après succès

#### Scenario: Interruption entre journal et checkpoint
- **WHEN** le processus s’interrompt après la préparation durable d’un réancrage
- **THEN** CAB reprend la même transaction authentifiée avant toute lecture métier ou append
- **AND** il refuse un fichier divergent des versions préparées au lieu de le remplacer
- **AND** il ne restitue pas READY tant que le journal et son checkpoint ne sont pas cohérents

#### Scenario: Premier ancrage authentifié
- **WHEN** le profil ne possédait aucune clé ni checkpoint HMAC et la chaîne structurelle est valide
- **THEN** CAB prépare une clé privée durable et le checkpoint du journal réancré
- **AND** la simple présence de la clé préparée ne change pas le mode de l’ancien journal avant application
- **AND** la perte de cette clé après le réancrage empêche de déclarer le journal sain


## ADDED Requirements

### Requirement: Anti-rejeu après effacement ciblé
CAB SHALL préserver les compteurs globaux d’allocation et une époque de
maintenance non identifiante lors d’un effacement ciblé. CAB SHALL NOT
réutiliser une identité technique de demande, opération, accès, job ou
transaction retirée. Un identifiant fonctionnel de session tel que CISMP5
SHALL pouvoir être réutilisé après la preuve d’absence avec une nouvelle
génération. La renumérotation de la chaîne du journal SHALL NOT remettre à
zéro les compteurs d’autorité, de fencing ou de once.

#### Scenario: Réutilisation du nom fonctionnel
- **WHEN** une nouvelle session adopte un nom fonctionnel dont l’ancien périmètre a été effacé
- **THEN** elle reçoit de nouvelles identités techniques et une génération supérieure
- **AND** aucun ancien reçu, token, once ou certificat de clôture ne l’autorise

### Requirement: Préservation authentifiée des événements conservés
Le réancrage terminal SHALL conserver exactement identités, types, dates,
acteurs, clés d’idempotence et données métier des événements des pairs.
Seules les séquences et métadonnées de format/chaînage SHALL pouvoir changer.
Le nouveau checkpoint SHALL être authentifié avec la clé applicable,
chargée localement sans restitution au modèle.

#### Scenario: Retrait de la cible dans un journal partagé
- **WHEN** une transaction qualifiée retire les événements de la cible
- **THEN** chaque événement des pairs conserve son identité et ses données métier sous le nouveau chaînage

### Requirement: Préconditions cryptographiques du réancrage
CAB SHALL vérifier la chaîne et le checkpoint attendu avant retrait. Une
intégrité invalide, une clé de signature indisponible ou un checkpoint attendu
non authentifiable SHALL empêcher la préparation. Un profil auparavant sans
HMAC SHALL pouvoir créer sa clé locale privée et son premier checkpoint,
sans prétendre authentifier rétrospectivement son passé.

#### Scenario: Ancien checkpoint sans clé
- **WHEN** un checkpoint existe mais aucune clé ne permet son authentification
- **THEN** CAB refuse avant la coupure et ne le remplace pas par un premier ancrage
