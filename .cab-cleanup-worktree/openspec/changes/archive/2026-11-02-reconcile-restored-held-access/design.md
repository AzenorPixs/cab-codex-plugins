# Conception

`GET /locks/reconcile-preview` expose seulement le propriétaire courant,
l’identifiant d’accès, ressources, révisions, opérations liées et un digest de
frontière ; aucun token ni contenu natif n’est retourné.

`POST /locks/reconcile-restored` exige ce digest, la version et le fencing
courants, un reçu neuf et des evidence. Le contrôleur vérifie les décisions
approuvées persistées, relit les fins natives exactes, exige les opérations
terminales, une session inactive, zéro permission et des révisions inchangées.
Il revérifie le digest avant la persistance. Le registre renouvelle le
token/fencing du même accès `HELD` et enregistre un reçu idempotent. Les
sous-opérations `PREPARED` sans effet sont annulées et invalidées localement.

Les accès inconnus, en cours, les permissions, effets incertains et ressources
recouvrantes demeurent protégés ; aucun nouvel accès ou `once` n’est créé.
