# Coordination possédée par les codeurs — cab-coder-coordination-1

## Cadrage et adoption
Le développeur et l’orchestrateur tranchent avant codage les choix nécessaires
au change, interfaces, priorités et ressources. La mission autorise les échanges
courants du codeur sans validation intermédiaire. Le parent conserve les seules
exceptions au cadrage et la revue finale. Le contrat métier commun reste dans
SESSION_COORDINATION.md du référentiel résolu par DEVOPS.md, sans copie embarquée.

Une nouvelle mission utilise autonomy/mandate avec coordination:true. La réponse
lie le codeur au projet/RUN/SID/contexte/génération et qualifie la capacité.
Pour un RUN autonome historique à frontière inactive et sans effet en attente :
POST /runs/<RUN>/coordination/adopt, header x-cab-continuity: cab-continuity-v1,
avec protocol:cab-coder-coordination-1, version, sessionId et authorization.
Conserver SID/RUN et l’identité de stockage historique. Celle-ci reste une
provenance ; le codeur identifié devient l’opérateur et l’ancien propriétaire
ne peut plus publier ou acquitter concurremment. Ne pas migrer une pause,
un envoi incertain ou une génération divergente par déduction.

## Opérations natives
Découvrir session_coordinate puis l’appeler via Code Mode, arguments littéraux :
request_id, run_id, reservation_version, session_id, change_id, directory,
action et args. Le broker passe par l’IPC Unix ; le noyau fournit son PID/UID,
recoupés avec le broker actif, puis le contrôleur vérifie l’appel natif exact.
Le magasin reste privé au compte du contrôleur, même si le broker a un autre UID.

| action | args |
| --- | --- |
| subscribe | dependency_id, kind change/task/capability, subject, criterion (identifiant sans espaces) |
| publish | notice_id, kind, subject, proof relatif existant, proof_sha256 complet, stage |
| inbox | objet vide ; retourne items, stades, provenance et fraîcheur des preuves |
| ack | dependency_id, notice_id ; acquittement du traitement, jamais validation métier implicite |
| outbox | notice_id ; reçus distincts des destinataires |
| status | objet vide ; liaison courante et cycles détectés |
| cancel-wait | request_id d’une commande WAITING, sans effet commencé ; INTENT reste protégé |

Les avis sont ciblés sur les abonnements. Aucun chat libre ou publication globale.
Le producteur annonce son propre change/tâche, pas le travail d’un pair. Les
capacités restent descriptives et ne créent aucune spécification ni permission.
Les niveaux sont candidate (travail disponible pour essais), tested (tests produits,
sans promesse de réussite), accepted (revue finale), delivered (reçu de publication)
et activated (preuve d’activation examinée). Les trois derniers exigent les reçus
d’autorité. L’activation externe est enregistrée par l’orchestrateur après livraison
sur /runs/<RUN>/coordination/activation-proof avec preuve/empreinte et authorization.
Une preuve périmée, absente ou protégée ne satisfait pas une dépendance.

## Direct, piloté et transport
Les codeurs directs gardent la CLI de dépendances et leur identité native.
La discovery annonce séparément cab-session-coordination-1, le protocole codeur
et ses limites. publish --stage candidate|tested --proof-sha256 permet de joindre
un niveau explicite ; fournir --controller-url pour notifier les codeurs pilotés
raccordés au même contrôleur/projet. L’ancienne CLI reste compatible sans ce flag.
Pour recevoir une notification Codex native, register --mode direct peut déclarer
--codex-socket, socket privé fourni par le client natif ; jamais un chemin deviné.
Le transport vérifie la liaison SGS, le projet et le tour natif avant steer.
Sans canal qualifié, l’avis reste durable et consultable, notification indisponible.
Le périmètre reste le même projet et le même contrôleur ; aucun support interhôtes
ou entre magasins privés indépendants n’est déduit de l’IPC broker inter-UID.

## Événements, pauses et reprise
Le contrôleur route automatiquement vers les SID codeurs actifs concernés,
avec intention durable et reçu natif distinct. Les notifications ne réveillent
pas l’orchestrateur. Leur message désigne un avis à consulter, sans instruction
métier supplémentaire. Plusieurs critères d’un même destinataire ne multiplient
pas l’envoi. Après réponse perdue : relire le même reçu, observer le message exact
et ne pas le renvoyer. Un préparé/unknown non prouvé conserve sa protection.
Les vérifications périodiques sont mécaniques ; elles ne sont pas des tours LLM.
Une pause explicite ou un dossier en revue finale ne sont jamais levés par un avis.

## Accès partagés et exceptions
Le profil adopté acquiert les chemins RW ensemble pour chaque atelier_execute,
pas pour toute la durée de la mission. WAITING est persistant, FIFO entre accès
incompatibles ; le broker attend sans demander de décision. Des chemins disjoints
continuent. Le codeur relit les entrées actuelles dans cette frontière et peut
fournir expected_revision (SHA renvoyé par les preuves de source) pour refuser une
base périmée avant effet. Une fin inconnue conserve le verrou ; aucune libération
sur timeout. Un autre avis ou une simple attente ne requiert pas le pilote.
Un cycle est exposé par status ; poursuivre les unités indépendantes et solliciter
une exception hors cadrage seulement si un arbitrage d’interface/priorité manque.
Les autres exceptions restent hors change, outil nécessaire absent et consultation
web. Aucune nouvelle allocation, installation ou publication finale n’est implicite.

## Reçus de tests
Pour autonomy_submit, chaque test peut fournir seulement son requestId, criterion
et outcome : le contrôleur joint le receiptDigest complet de son registre.
Un digest fourni reste comparé strictement. Le refus conserve son code historique
et expose un motif fermé et testIndex ; jamais de secret ni relance d’un essai.
Les vérifications de résultat, révision et couverture restent obligatoires.
