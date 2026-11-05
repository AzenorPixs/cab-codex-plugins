# Incidents — CAB 2.2.40

Commencer par le [triage des observations](incident-triage.md) avant de conclure à une panne.

## Problèmes de codage et coordination du correctif CAB

Appliquer [le suivi des incidents CAB](coding-incidents.md) : diagnostic et
récupération qualifiée dans le mandat avant toute demande de correctif.
Conserver preuves, propriétaires et permissions ; une coordination inter-chats
ou une création exige la demande explicite correspondante et respecte les
clôtures déjà décidées. Aucun incident ne réémet une once ni ne gèle les
ressources indépendantes.


Restauration ASK par révocation de grants protégés : l’accord permanent du
développeur couvre la maintenance partagée bornée selon
[native-permission-grants](native-permission-grants.md). Ne pas redemander
cet accord à chaque session ; une frontière active se coordonne sans forçage.

Notification stalled/FAILED sans lease : [qualifier le sous-état](technical-recovery.md#notification-bloquée--qualifier-le-sous-état) avant toute action ciblée.

Accès HELD non restauré, membres terminaux et token perdu : [libération owner](recovery-policy.md#libérer-un-accès-après-perte-de-token-par-compactage), sans restitution implicite des baux ou effets inconnus.

Token perdu, accès HELD dédié à un seul edit/shell refusé avant once :
[retrait puis libération propriétaire](approved-attached-shell-retirement.md#accès-dédié-à-un-seul-membre-refusé-avant-once), deux reçus et gardes conservées.

Write V2 refusé (permission edit), call/ACK masqués dans un ancien diagnostic :
[preuve et retrait qualifiés](approved-attached-shell-retirement.md#write-v2-refusé-sous-permission-edit), sans conversion ni exécution de l’input divergent.

Remédiation COMPLETED avec livraisonfalse : [distinguer exécution et résultat vérifié](technical-recovery.md#résultat-vérifié-dune-réconciliation-de-notification), sans consommer un nouveau budget à l’aveugle.
