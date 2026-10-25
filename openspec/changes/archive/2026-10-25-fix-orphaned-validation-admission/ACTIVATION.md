# Proposition d'activation initiale — historique avant SCM

Le lot autorisé couvre les sources et les tests isolés seulement. Aucune
installation, écriture Pixs/runtime, commande de service, opération Git ou
activation de cette API n'a été effectuée.

Le SCM 1.8.0 qualifie désormais le profil générique de maintenance gelée et
les installations par releases. La proposition actualisée figure dans
ACTIVATION.md du change support-frozen-recovery-controller-maintenance.
Les limites ci-dessous décrivent l'état initial ; elles ne doivent pas être
utilisées comme preuve que la source 1.8.0 n'a pas été qualifiée. Aucun
chargement vivant n'est pour autant autorisé ou démontré par ces essais.

## Identité de la récupération à préserver

| Élément | Référence transmise, à revérifier avant effet |
|---|---|
| RUN | cismp1-pixs-02716fc18b3546c0 |
| Job | job-9d93432472b146378e2af52bf46c8454 |
| Candidate unique | ses_e90f4d2ffffe5JtAqkUyZmJPfq |
| Recovery | recovery-d35b1d2f2ef646a599a33faa8ff42640 |
| Prévol orphelin | resume-c651b0ac740043da8fd4ce5a2dbb457e |
| Approbation | approval-6c5ce5f963124cc48430366659514ac0 |

L'ancienne session, les jalons C08, le gel et les preuves natives restent
conservés. Les champs operation_id, operation_digest, resources,
expected_revisions, reservation_version et le payload complet doivent être
repris de la notification et des preuves originales ; aucun n'est inventé.

## Obstacle avant chargement

Le contrôleur importe ses modules au démarrage. Copier quatre fichiers ne
modifie pas le code déjà chargé. La voie normale de mise à jour appelle
/coordination/global/confirm, dont checkCohort refuse une récupération ouverte
avec run-not-quiescent. Cette garde existe aussi dans le contrôleur antérieur.
Le présent correctif ne la modifie pas. Une requête de maintenance peut donc
rester DRAINING ; il ne faut ni la forcer ni présenter /cab update comme une
procédure déjà compatible avec C08 gelé.

Il n'existe pas, dans le périmètre examiné, de procédure d'activation sans
chargement du nouveau code ni de recharge ciblée supportée. L'interdiction
actuelle de relance partagée reste donc une limite effective.

## Décision distincte indispensable

Avant tout effet, faire autoriser et qualifier une procédure de maintenance
capable de préserver explicitement une récupération gelée et prouvée sans
effet, ainsi que les pairs. Elle doit préciser ses briques, processus,
destinations réelles, sauvegardes privées, protections, conditions d'arrêt,
preuves natives, retour arrière et autorité. Si elle nécessite un contrat ou
une garde supplémentaire, soumettre ce périmètre séparément ; ce lot ne
l'implémente pas et n'autorise aucune dérogation implicite.

Une telle qualification doit partir du contrôleur 1.7.1 réellement actif et
prouver le passage jusqu'au correctif chargé. Un essai démarrant directement
le contrôleur corrigé sur une fixture gelée prouve la restauration des
identités, pas le franchissement sûr de cette frontière de maintenance.

## Séquence après chargement explicitement autorisé et prouvé

1. Recontrôler processus, workspace, quatre empreintes, MCP/SSE et tous les
   RUN. Exiger la capacité notificationReconciliation=rejection-only-v1 et
   les mêmes identités, générations, pauses, réservations et preuves.
2. Recontrôler le préfixe natif, PENDING du même approval_id, ask, candidate
   inactive, absence de permissions et d'effet. Toute incertitude arrête la
   séquence ; l'ancien état PENDING seul ne suffit pas.
3. Envoyer uniquement POST /runs/<RUN>/validation/reconcile avec cinq clés :
   transactionId neuf, developerAuthorization spécifique, jobId, recoveryId
   et approval original intégral. Conserver le reçu REJECTION_ONLY.
4. Soumettre une décision explicite rejected pour ce requestId par la route
   normale. Aucun approved, needs_clarification ou outil natif n'est permis
   pour cette demande. Poller le même approval_id jusqu'à REJECTED réel.
5. Après readiness corrélée sans attente, appeler le retry existant avec
   previousPreflightRequestId=resume-c651b0ac740043da8fd4ce5a2dbb457e,
   nouvel identifiant de prévol, mêmes job, recovery et candidate. Vérifier
   la frontière native conservée. Ne pas créer de nouveau RUN/job/session.
6. Après réactivation sûre noReply/PATCH ask/lecture, générer sans tools=true
   le seul nouveau prévol /usr/bin/true. Exiger sa décision, réponse MCP,
   permission once unique, exit 0, fin/libération d'accès et READY avant
   complete. Les tests produit restent hors de cette procédure de prévol.

## Repli et preuves

Avant première réconciliation, un repli doit préserver le runtime courant.
Après création d'un reçu, ne pas remettre un ancien registre ou perdre le
verrou rejectionOnly ; un ancien lecteur peut refuser ces champs. Une perte
de contexte local conserve le reçu mais refuse sa restauration automatique.
Les permissions consommées, messages natifs et preuves ne sont jamais rejoués
ou réécrits. La publication du paquet, le chargement effectif et la réparation
du prévol restent trois résultats séparés à prouver.
