## Décision

L’état systemd failed est un résultat du processus, pas une preuve qu’il
fonctionne encore. CABU accepte ce résultat seulement si MainPID est nul.
Un PID vivant ou deactivating reste refusé. Le stop de groupe qui suit
normalise l’unité, puis le contrôleur cible doit adopter le certificat exact.
Le code 78 n’est pas transformé en preuve de communication ; seul le certificat
scellé puis adopté conserve ce rôle.

## Preuve de besoin

Reçu 2.2.2 update-489105cc-10ca-411d-ade8-0029931a04f5 : ROLLED_BACK,
update-controller-shutdown-unconfirmed. MainPID=0, ActiveState=failed,
ExecMainStatus=78. Le journal de transfert est SEALED ; sa divergence observée
après attente est l’expiration. Aucune nouvelle autorité métier n’est accordée.
