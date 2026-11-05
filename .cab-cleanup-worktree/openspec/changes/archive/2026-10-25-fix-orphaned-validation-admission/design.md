## Décisions

L'admission ordinaire conserve la vérification native du contenu dans le
contrôleur. Le contexte contrôle ses identités et ask, recontrôle après await,
puis appelle une admission synchrone : propriétaire et opération sont
persistés ensemble avant validations.set et avant tout traitement de décision.
Un échec de persistance ferme le registre et ne transmet aucune permission.

POST /runs/<runId>/validation/reconcile reçoit transactionId,
developerAuthorization, jobId, recoveryId et approval (payload original exact).
Cette API est réservée au prévol courant d'un job armé, gate OPEN, gelé.
Elle vérifie santé, racine, MCP, inactivité des deux sessions, ask, absence
de permission/décision/effet, préfixe natif historique intact, une demande
native completed/PENDING et ses éventuels pollings PENDING exacts. Aucun
autre outil n'est accepté après la frontière de prepare.

Le propriétaire et l'opération PREPARED doivent correspondre intégralement,
sans accès attribué. Le reçu conservé sous le propriétaire contient identités,
empreintes de demande/autorisation/préfixe et date, sans corps de message.
L'opération est durablement marquée rejectionOnly et la validation locale est
recréée avec ce même verrou. Aucun agent automatique n'est sollicité.

La décision rejected passe par la route normale. Le polling du même approval_id
doit fournir REJECTED ; retry reste inchangé et réserve ensuite un essai neuf.
Un reçu répété identique est restitué sans nouvel effet ; un contenu divergent
est refusé. Après perte du contexte local, le reçu n'autorise aucune
reconstruction automatique ni réutilisation de décision.

## Activation distincte

Ce lot ne charge pas le correctif dans un processus existant. Une activation
exige une proposition séparée : inventaire des briques réelles, sauvegardes
privées autorisées, frontière sûre des pairs et contrôle des identités avant
et après chargement. Aucun hot patch, purge, nouveau RUN, nouvelle candidate
ou changement manuel du registre ne remplace cette procédure.

## Vérifications

Fixtures isolées : refus ask sans propriétaire/opération, course ask,
persistance échouée, refus d'identités altérées, effet commencé/incertain,
réconciliation idempotente et durable, refus de toute décision autre que
rejected et de toute acquisition, isolation du pair, polling puis retry
inchangé dans la candidate. Tests Node/Python applicables hors runtime réel.
