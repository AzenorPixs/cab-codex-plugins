# Conception

Le prévol owner/RUN-scoped scelle l’accès `EXECUTING` ou `UNKNOWN`, l’opération
shell unique, le `callID`, le digest du mandat, le port write, la version, le
fencing et le digest de frontière. Le contrôleur lit deux fois le transcript
V2, la session, les permissions et le journal natif. Il exige un tool part
exactement corrélé, `status=completed`, `metadata.timeout=true`, sans exit ni
shellID, aucun permissionId pendant, une session inactive et des décisions
durables concordantes.

Le reçu marque l’accès `HELD` avec `timeoutQuarantine` et renouvelle son
fencing/token. L’opération originale reste `EXECUTING` avec son `once` intact ;
aucun résultat terminal ni libération n’est inventé.

L’ordonnanceur peut accorder un accès `read` au même `port:*` uniquement au
même RUN lorsque l’accès d’écriture est sous quarantine. L’accès garde les
autres ressources et réservations normales ; chaque nouvel effet exige sa
propre décision et son propre `once`. Tout accès write recouvrant et toute
lecture d’un autre RUN restent bloqués.

La quarantine et le verrou survivent au redémarrage. L’accès ne peut être
libéré qu’après une vraie preuve native terminale, distincte du timeout.
