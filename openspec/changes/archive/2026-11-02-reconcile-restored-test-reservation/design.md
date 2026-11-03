# Conception

Le prévol `/test-resources/reconcile-preview` retourne uniquement une
projection non secrète du bail restauré et un `boundaryDigest` calculé à partir
du propriétaire RUN, `contextId`, version, transaction, fencing, ressources,
opérations liées et résultats durables. Le token courant n’est ni lu par le
client, ni exposé dans le prévol.

La mutation `/test-resources/reconcile-restored` exige ce digest, le
`transactionId`, la version courante, le fencing et un `reconciliationId`
neuf. Le contrôleur relit les opérations liées, refuse toute opération
`ISSUING`, `EXECUTING` ou `UNKNOWN`, vérifie les fins natives corrélées,
confirme deux fois l’absence d’activité de session et de permission, puis
revérifie le digest avant de persister le reçu. Le registre renouvelle en
interne token et fencing et garde le bail `HELD` sur les mêmes ressources.

Le POST retourne le bail au propriétaire exact pour la suite normale du cycle ;
le token n’est jamais écrit dans un log, checkpoint ou fichier de rapport. Un
rejeu du même `reconciliationId` et du même digest est idempotent. Toute
divergence conserve le bail restauré et la barrière.

Pour que la preuve NO_EFFECT d’une opération fichier disjointe puisse être
évaluée pendant que ce bail reste restauré, le contrôleur reconnaît uniquement
le candidat UNKNOWN/approved existant lors du calcul de son identité. Cette
lecture ne crée ni accès ni décision ; la clôture dépend toujours du transcript,
du journal, de l’absence de permission et des révisions inchangées.
