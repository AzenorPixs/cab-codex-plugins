## ADDED Requirements

### Requirement: Cohérence des versions avant préparation du paquet
La préparation MUST valider la version du moteur contre les manifestes
CAB/CCAB/CABU, leurs commandes et les métadonnées frontend et Python.
Elle MUST refuser une divergence ou un fichier requis manquant avant toute
écriture du payload. La finalisation installée MUST conserver son refus
indépendant des versions divergentes.

#### Scenario: Plugin périmé
- **WHEN** un manifeste embarqué annonce une autre version que le moteur
- **THEN** la préparation échoue avant copie ou archivage et conserve le payload précédent

#### Scenario: Versions alignées
- **WHEN** moteur, commandes, manifestes et métadonnées partagent la version3.2.1
- **THEN** la préparation conserve cette version dans le manifeste runtime et la finalisation peut vérifier les mêmes contenus

### Requirement: Demande MCP agnostique de mise à jour CAB
cab_update MUST accepter une demande explicite provenant d’un acteur CAB actif
authentifié, indépendamment du compte, UID ou agent. Le request_id MUST être
durable et idempotent. Seules une version SemVer optionnelle et la source
officielle CAB MUST être admises ; aucun shell, URL ou paquet local du client.
Une demande concurrente MUST être refusée et une demande divergente MUST NOT
réutiliser le même identifiant. Le demandeur MUST être audité.

#### Scenario: Demande CABU
- **WHEN** un client CAB authentifié invoque CABU via le MCP
- **THEN** CAB enregistre le job sans sudo client ni liste de comptes imposée

#### Scenario: Réponse perdue
- **WHEN** le client relit ou répète la même demande
- **THEN** il obtient le même job sans réinstaller ni créer un deuxième effet

### Requirement: Installation autonome hors du service actualisé
CAB MUST exécuter le téléchargement officiel, le contrôle SHA256 et Debian,
l’installation et les vérifications via une unité système distincte de
cab.service. Ce parcours MUST survivre au redémarrage de CAB sans intervention
LLM. Les étapes et reçus MUST être durables. Un effet non réconcilié MUST
rester UNKNOWN et protégé contre tout rejeu automatique.

#### Scenario: Redémarrage pendant installation
- **WHEN** le paquet redémarre cab.service
- **THEN** le worker indépendant continue et le client MCP reprend la lecture du même job

### Requirement: Résultat OK uniquement après activation vérifiée
Le MCP MUST retourner state=OK et la version nouvelle uniquement après
confirmation du paquet entièrement configuré, du service READY à cette version
et de la finalisation vérifiée. Un échec MUST être explicite sans prétendre
à une réussite. Les gardes de maintenance existantes MUST rester applicables.

#### Scenario: Installation partielle
- **WHEN** postinst échoue ou le service n’atteint pas la version cible
- **THEN** la demande n’annonce pas OK et conserve son diagnostic et ses preuves

### Requirement: Disponibilité GitHub vérifiée en arrière-plan
Le chargement de l’accueil CAB MUST demander une vérification asynchrone de
la release GitHub officielle. CAB MUST partager un cache unique : une vérification faite depuis moins
de24heures MUST NOT être rejouée, même au chargement de l’accueil. Le prochain
contrôle automatique MUST être tiré au sort dans les24heures suivant
l’expiration de ce délai minimal. Les appels réseau MUST rester hors du rendu et des boucles métier.

#### Scenario: Accueil chargé pendant une réponse GitHub lente
- **WHEN** la vérification distante est en cours
- **THEN** CAB affiche immédiatement sa page et ses données disponibles et continue ses opérations

### Requirement: Étiquette de mise à jour dans le bandeau
Une version stable officielle confirmée plus récente MUST faire apparaître
une étiquette Mise à jour à côté de la version CAB. Son clic authentifié MUST
créer le même job autonome que le MCP, sans sudo ni LLM intermédiaire. Les
états et la nouvelle version vérifiée MUST être affichés ; une demande en cours
MUST NOT être réémise après navigation ou indisponibilité temporaire.

#### Scenario: Clic sur l’étiquette
- **WHEN** un utilisateur authentifié clique Mise à jour
- **THEN** CAB conduit l’installation du même job et annonce OK seulement après activation vérifiée

### Requirement: Page administrative de mise à jour manuelle
/administration/update MUST afficher la version locale et la version en ligne,
et fournir un bouton manuel permanent utilisant le job système commun. Chaque
ouverture authentifiée de cette page MUST demander un contrôle GitHub forcé,
hors de la limite du cache automatique24h, toujours sans bloquer le rendu.

#### Scenario: Consultation administrative
- **WHEN** l’administrateur ouvre la page de mise à jour
- **THEN** les versions connues et le bouton apparaissent immédiatement et le contrôle distant est demandé en arrière-plan
