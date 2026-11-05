# Design

Le broker utilise le diagnostic filtré `{http_status,error_code}` déjà
persisté sous la lease de notification. Seuls un code d’erreur non nul et un
statut HTTP reconnu (400/409) autorisent `NOT_ADMITTED`. La transition est
écrite une fois, avec son horodatage et l’événement append-only
`APPROVAL_NOT_ADMITTED`; l’identifiant, les ressources et le diagnostic
historiques restent inchangés.

La clôture intervient au retour d’une notification déterministement refusée,
au prochain `get_approval`/`poll_approval`, ou dans la réconciliation
périodique des demandes pendantes. Le même approval ne peut plus être renvoyé
ou décidé ; un nouvel essai exige un nouvel identifiant, une relecture des
révisions et une décision CAB indépendante. Aucune permission native ni
commande métier n’est créée.

Les erreurs réseau, statuts hors liste, diagnostics malformés et codes non
reconnus ne sont pas terminalisés ; ils restent `PENDING` selon le protocole
actuel.
