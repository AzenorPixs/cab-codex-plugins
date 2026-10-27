## MODIFIED Requirements

### Requirement: Destinations fermées et privées
L'outil MUST écrire seulement dans des destinations CAB explicites hors workspace et paquet source, avec propriétaire et type vérifiés. Les liens non reconnus MUST être refusés. Un layout managed-release explicitement autorisé MAY résoudre en lecture des liens relatifs internes, installer une nouvelle release immuable puis basculer atomiquement l'entrée du contrôleur arrêté, sans écriture à travers un lien ni altération de l'ancienne release.

#### Scenario: Lien non géré
- **WHEN** l'entrée est absolue, sort de la racine, traverse un lien interne ou diverge de l'autorisation
- **THEN** aucun arrêt, remplacement ou changement de lien n'est effectué

#### Scenario: Destination dans le projet
- **WHEN** une destination désigne le workspace piloté
- **THEN** l'outil refuse sans aucune écriture dans ce workspace

#### Scenario: Release gérée conservée
- **WHEN** le contrôleur est chargé depuis la nouvelle release sous autorité d'amorçage
- **THEN** la release originale reste identique et les processus broker/Web ainsi que les liens non concernés sont préservés

### Requirement: Maintenance durable et frontière sûre
Le profil ordinaire MUST acquérir SHARED_MAINTENANCE et confirmer HELD après quiescence avant arrêt. Seul frozen-recovery-controller MAY suivre l'autorité BOOTSTRAP_HELD spécifiée, sans falsifier le HELD original. Aucun profil MUST décider, rejouer une permission ou purger le runtime. Une attente bornée MUST conserver processus et gel.

#### Scenario: RUN encore occupé
- **WHEN** la cohorte reste occupée à l'échéance
- **THEN** la transaction reste en attente, aucun artefact actif n'est remplacé et aucun processus n'est arrêté

### Requirement: Déploiement des quatre briques et états conservés
Le profil ordinaire MUST prendre en charge les quatre briques et restaurer leurs états actif/inactif initiaux. Le profil frozen-recovery-controller MUST conserver broker, OpenCode et Web et ne remplacer que la fermeture d'imports du contrôleur, avec suspension contrôlée du superviseur. Aucune activation au login MUST être ajoutée.

#### Scenario: Web actif et superviseur inactif
- **WHEN** le profil ordinaire met à jour ces composants
- **THEN** le Web actif est relancé sur le nouveau jeu et le superviseur reste inactif

## ADDED Requirements

### Requirement: Alignement ordinaire des releases gérées
Le mode ordinaire layout=managed-release MUST préparer les quatre briques sous leurs racines autorisées, confirmer HELD, puis charger de nouvelles releases immuables et basculer les seuls pointeurs contrôlés. Il MUST préserver les releases antérieures et refuser les liens non reconnus. Le succès MUST vérifier les versions réellement chargées 1.8.0, le broker reconnecté et les identités conservées avant reprise métier explicite.

#### Scenario: Après récupération mixte
- **WHEN** complete a réussi et une seconde maintenance ordinaire est explicitement autorisée
- **THEN** le contrôleur, le superviseur, le broker et le Web sont alignés sans fermeture OpenCode ni effacement de son historique

#### Scenario: Échec après bascule ordinaire
- **WHEN** le chargement échoue sous HELD après installation des nouvelles releases
- **THEN** les pointeurs et versions actives précédents sont restaurés sans modifier les anciennes releases ni rejouer une permission

### Requirement: Transition mixte bornée au rétablissement
Le profil gelé MAY charger le contrôleur 1.8.0 avec broker, superviseur et Web 1.7.1 conservés, uniquement pour maintenance et récupération resource-scoped-v1 qualifiées. Il MUST publier séparément version du paquet, empreinte du contrôleur chargé et versions des processus préservés. Une autre version ou une capacité inconnue MUST refuser cette transition ; elle MUST NOT annoncer tout le runtime aligné en 1.8.0.

#### Scenario: Broker original conservé jusqu'au prévol
- **WHEN** le contrôleur 1.8.0 réconcilie puis reprend le prévol via le broker 1.7.1 conservé
- **THEN** les échanges MCP et la permission fraîche restent corrélés, le broker reste vivant et l'état mixte reste explicitement annoncé

### Requirement: Frontière avant reprise métier
Le profil mixte MUST conserver les pairs sous PAUSE explicite et limiter la reprise ciblée au prévol. complete MUST NOT valoir autorisation de mandat métier dans ce profil. Le pilotage MUST attendre un alignement homogène 1.8.0 vérifié par maintenance ordinaire distinctement autorisée, puis une reprise explicite ; aucune reconnexion ou relance MUST découler du seul incrément de version.

#### Scenario: Prévol réparé, processus encore mixtes
- **WHEN** complete a réussi avec le broker original conservé
- **THEN** aucun mandat métier n'est approuvé et les pairs restent en pause jusqu'à l'alignement et aux contrôles de reprise

### Requirement: Profil de maintenance du contrôleur gelé
Le profil frozen-recovery-controller MUST préparer une fermeture d'imports vérifiée et sauvegardée, conserver OpenCode, broker et Web, puis restaurer l'état initial du superviseur. Il MUST exiger autorisation humaine spécifique, transaction durable et preuves indépendantes. Les autres profils MUST conserver leurs gardes.

#### Scenario: Broker conservé
- **WHEN** ce profil charge le contrôleur corrigé
- **THEN** aucun arrêt, remplacement ou connect/disconnect du broker et aucun arrêt OpenCode ou Web n'est effectué

### Requirement: Amorçage explicitement distinct du HELD original
Pour un original 1.7.1 identifié, un reçu privé BOOTSTRAP_HELD MAY autoriser l'arrêt contrôlé après DRAINING corrélé et refus normal observé, uniquement avec preuve fraîche cumulative d'absence d'effet. Il MUST NOT être présenté comme HELD du contrôleur original. Le nouveau contrôleur MUST adopter et recontrôler le reçu avant son vrai HELD.

#### Scenario: Refus original conservé
- **WHEN** l'ancien contrôleur refuse HELD pour la récupération gelée admissible
- **THEN** ce refus reste prouvé et seule l'autorité d'amorçage explicitement autorisée peut permettre le chargement

### Requirement: Repli conservatoire du profil gelé
Le repli MUST préserver les états métier et historiques, restaurer seulement les artefacts compatibles et signaler ROLLED_BACK_FROZEN si la maintenance reste gelée. Un reçu REJECTION_ONLY MUST interdire un retour à un lecteur incompatible. Une interruption MUST reprendre le même journal sans permission ou effet rejoué.

#### Scenario: Original restauré sous drainage
- **WHEN** le nouveau chargement échoue avant reçu REJECTION_ONLY
- **THEN** le code original peut être rétabli sans restaurer un ancien registre et sans annoncer la maintenance libérée
