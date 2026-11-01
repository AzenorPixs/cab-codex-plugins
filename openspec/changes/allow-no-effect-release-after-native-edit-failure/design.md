# Design

Le registre stocke le résultat natif `completed` ou `error` après la preuve de
fin. L'empreinte de la preuve de fin existante reste stable ; une empreinte
distincte de la partie native permet de sceller le classement d'effet sans
réécrire l'historique. Les preuves répétées restent idempotentes et les
divergences sont refusées.

Avant `/locks/release`, les opérations terminales historiques sans issue
persistée sont réconciliées en relisant le transcript exact et en exigeant une
correspondance unique avec l'empreinte déjà enregistrée. Si cette preuve manque,
est dupliquée ou change, l'accès reste `HELD`.

`NO_EFFECT` est admis uniquement lorsque chaque écriture terminale a une preuve
native d'erreur, aucune écriture réussie n'est présente, tous les effets sont
terminés et chaque révision de ressource égale encore la révision attendue. Une
erreur native ne fait pas avancer la révision ni `pendingWrites`. Une écriture
réussie reste un effet même si une commande termine avec un code non nul. Les
accès `COMPLETED`, `RECONCILED`, `HELD`, les fencing et l'idempotence existants
restent inchangés.
