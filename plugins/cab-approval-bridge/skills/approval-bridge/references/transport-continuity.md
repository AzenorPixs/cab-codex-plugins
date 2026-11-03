# Continuité du protocole — CAB 2.2.9

Les validations admises et décisions sont conservées dans un checkpoint privé
distinct du registre métier. Leur restauration vérifie les identités et les
décisions du registre avant usage. Une réponse once incertaine ne devient
jamais exécutable à partir de ce checkpoint. Le statut du contexte expose
communicationPersistence.available et sa séquence, sans commande ni contenu.

Les observations filtrées sont persistées dans protocol-observations.json,
distinct du fichier statistique controller-observations.json. GET
/monitor/events retourne instanceId, sequence, cursor et durable. Le paramètre
cursor ou Last-Event-ID en SSE permet un rattrapage borné ; replay=gap signale
une fenêtre dépassée ou une identité étrangère. Les observations ne donnent
aucune décision ni preuve native d’effet. Une indisponibilité de cette collecte
est exposée et ne clôt aucune opération métier.

## Transfert contrôlé

GET /transport/status expose le protocole cab-continuity-v1 et son reçu filtré.
Après préparation complète des artefacts, CABU peut appeler POST
/transport/prepare avec {transactionId} et le header x-cab-continuity égal au
protocole. Le contrôle loopback, origine, type JSON et transaction reste requis.
La préparation suspend seulement l’émission des permissions pendant la courte
frontière. Elle attend au plus 250 ms une frontière sans transmission critique,
transition ou mutation HTTP en cours ; une impossibilité annule cette tentative
sans arrêter les sessions ni attendre les commandes natives longues.

Les nouvelles mutations reçoivent temporairement HTTP 503
transport-update-in-progress ; elles ne sont pas déclarées rejetées ou
exécutées. Le même identifiant de demande et le reçu existant sont conservés.
POST /transport/cancel avec la même transaction abandonne seulement cette
barrière technique, sans libérer d’accès ou de bail. Une préparation expirée
ne libère aucune ressource métier.

À l’arrêt contrôlé, le contrôleur attend les traitements HTTP et écritures de
job, puis scelle l’état exact du registre et les accès déjà à réconcilier.
L’instance suivante adopte ce reçu une seule fois, sous l’autorité exclusive
du registre, après vérification du chemin, du workspace, de l’identité OpenCode,
des empreintes et de la fenêtre de trente secondes. Elle conserve exactement
les protections antérieures ; un accès déjà incertain ne devient pas sain.

Un crash sans reçu scellé, un reçu consommé, expiré ou divergent conserve la
restauration protégée historique. La génération de service ne modifie pas les
identités RUN/job/session, le choix LLM ni les permissions consommées. Une
transition depuis 2.1.81 ne possède pas ce certificat et doit être rapportée
distinctement d’un transfert compatible certifié.

## Broker préservé

La readiness peut être transférée seulement si le broker est READY, sa date
native a moins de trente-cinq secondes, le PID et le démarrage système sont
inchangés et la connexion MCP est encore connected. L'instance et checked_at
ne sont pas renouvelés ; restored_from=certified-handoff distingue ce reçu
de la prochaine publication native. Le contenu reste privé au journal de
transfert. Une vérification impossible conserve broker indisponible jusqu'à
publication, sans annuler un certificat métier valide. Un broker rechargé
publie lui-même son identité après le démarrage vérifié du contrôleur.

Après perte de réponse MCP, lookup_validation retrouve le reçu par identité
exacte et permet le polling du même approval_id. Cette lecture native qualifiée
peut être faite pendant un prévol ; found=false ne prouve ni NO_EFFECT, ni refus
métier, ni absence d'une once consommée.
