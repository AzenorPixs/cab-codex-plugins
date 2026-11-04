# ASK effectif et terminal non rattaché — CAB 2.2.28

## Why
C12 a observé un shell terminal sans ACK CAB ni rattachement. L’API native
révèle un grant node * préexistant au call, partagé au projet et correspondant
à la commande. OpenCode2.2.5 honore ce grant même si session.permissions affiche
ASK ; le client CAB ne vérifiait que ces règles déclarées. La fixture réelle
reproduit le contournement, y compris session neuve, PATCH inchangé et reload.
L’API saved/DELETE rétablit réellement ASK sans redémarrage. Une fois l’appel
survenu, la revue READ_ONLY est bloquée par une référence de parent qui n’est
pas une liaison effective, et par l’absence de sources fichiers pour du code inline.

## What Changes
Auditer les grants natifs sauvegardés avant prompt permissionné/décision/once
et reprise superviseur ; interdire always dans le client CAB. Fournir un plan
et une révocation API sous mandat de maintenance partagée explicite, identité
projet/processus figée, frontière inactive, journal privé et préservation des
grants hors actions protégées. Aucun nettoyage implicite dans la consultation.
Étendre la revue terminale à un enfant non rattaché qui référence un parent
HELD compatible, et au code inline explicitement revu. Ne créer aucune once,
nativeResult ou preuve de contrôle d’une exécution hors chaîne.

## Scope
Client, gardes de pilotage, réconciliation/observabilité et tests/docs/OpenSpec.
Aucune modification manuelle de RUN Pixs, de fichier métier ou de droit OS.
Une révocation partagée n’est pas décidée par le seul mandat C12 ; elle exige
l’autorité de maintenance couvrant le projet et ses consommateurs. Les deux
sessions Pixs sont coordonnées par le correcteur mandaté. Source2.2.28 puis
commit/publication/CABU ; revue propriétaire et preuve ASK réelle distinctes.
Code non attribué ; ACL ultérieure.
