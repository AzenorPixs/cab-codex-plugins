# Restitution explicite d’une réservation de test sans effet — CAB 2.1.31

## Choisir le parcours

La restitution ordinaire décrite dans concurrent-runs.md exige nettoyage puis
vérification. Elle reste prioritaire dès qu’une mutation a eu lieu. La route
POST /runs/<runId>/test-resources/release-unused est une exception distincte :
aucune préparation, copie, installation, compilation, test mutant ou écriture
de l’environnement ne doit avoir été engagée. Un doute interdit cette voie.
Aucun timeout, échec SSH, exit0 du pilote local ou texte de commande ne vaut
preuve automatique d’absence d’effet. Ne jamais fabriquer cleanup/restored.
Cette route ne prouve ni disponibilité distante, ni réussite du diagnostic.

## Préparation de la décision

L’orchestrateur examine les mandats exacts, tous les appels natifs et leurs
résultats depuis l’acquisition ; il conserve leurs preuves non secrètes.
Une autorisation humaine spécifique à la réservation est requise, référencée
par developerAuthorization (500 caractères maximum). L’opérateur garantit sa
provenance : une chaîne JSON n’authentifie pas elle-même le développeur.
Cette autorisation ne remplace pas l’attestation de l’orchestrateur.

Libérer les accès de commande terminés par la procédure existante. Conserver
RUN, job et session ; aucun désarmement ou réarmement n’est requis. À la
frontière : aucune permission native, validation indécise, décision approuvée
non consommée, opération active/inconnue, mandat courant ou recovery. Un gel,
une suspension ou une réservation restaurée non réconciliée reste bloquant.
GET /runs/<runId>/test-resources donne unusedReleaseBoundary pour HELD.

## Corps exact de release-unused

Fournir version, transactionId, token, fencing, contextId, sessionId,
boundaryDigest (unusedReleaseBoundary relu), developerAuthorization, evidence,
attestation et nativeProof. Ne jamais afficher le jeton dans le chat.
Les clés supplémentaires sont refusées.

attestation est {noEnvironmentMutation:true,noMutatingMandate:true,operations}.
operations contient exactement une entrée {operationId,classification} par
opération du cycle : read-only-no-effect pour une commande native terminée
examinée sans effet, cancelled-without-execution pour une opération annulée
avant toute émission native. Ni omission, ni doublon, ni classification
automatique. Le cycle comprend les opérations attachées à la réservation et
toutes celles du même contexte préparées depuis son acquisition.

nativeProof est {messageCount,toolCount,historyHash}. Lire l’historique complet
avec messages(sessionId,workspace) du client CAB de même version. messageCount
est sa longueur ; toolCount compte toutes ses parts type=tool ; historyHash
est le SHA-256 du JSON de cet historique normalisé, en triant récursivement les
clés d’objets et en conservant l’ordre des tableaux (fonction proofHash du
module maintenance-proof). Les empreintes incluent les parties complètes ;
ne pas les extraire de textes libres ni reconstituer un transcript partiel.
Les preuves peuvent contenir des données sensibles : leur traitement et leur
stockage doivent rester locaux et privés, sans copie brute dans le chat.

Le contrôleur relit deux fois l’historique et contrôle la frontière. Il
recontrôle aussi les fins déjà COMPLETED : identité, commande exacte, call,
once acquittée, dates et résultat inchangés. Une commande terminée exit1 peut
être examinée sans effet, mais reste exit1 dans les preuves. Les outils du
cycle inconnus, écritures, fins manquantes, sorties marquées tronquées ou
compaction depuis l’acquisition sont refusés. Une preuve indisponible ou
changée impose une nouvelle analyse, jamais un retry exécutable automatique.

## Reçu et compatibilité

Le reçu RELEASED conserve unusedReleaseReceipt.mode=unused-no-effect, les
empreintes d’autorisation, attestation, frontière, historique et références
de preuve, ainsi que les identifiants des opérations. Le transcript et
l’autorisation brute ne sont pas ajoutés à ce reçu. Un rejeu JSON canonique
identique rend le même reçu ; tout rejeu divergent ou par release ordinaire
est refusé. Les once consommées restent consommées et aucun outil n’est lancé.

Les autres gardes, notamment extend, publication et gate, restent inchangées :
elles ne cessent de bloquer que si la réservation a réellement été restituée
et si leurs propres conditions sont satisfaites. Les anciennes réservations
sans reçu restent lisibles. Un ancien lecteur strict refuse le reçu enrichi ;
un retour en arrière nécessite une réconciliation autorisée, sans restaurer
une sauvegarde effaçant des preuves. La livraison source n’active rien et ne
restitue aucune réservation réelle.
