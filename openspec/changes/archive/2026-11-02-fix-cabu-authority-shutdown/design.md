## Choix

Pendant un transfert PREPARED, CABU envoie SIGTERM au seul processus principal
du contrôleur via systemctl kill --kill-who=main. Il attend inactive avant le
stop des unités sélectionnées. L’ancien contrôleur conserve ainsi son helper
flock pendant le flush et le scellement ; KillMode=mixed protège les arrêts
futurs. Le transfert doit toujours être adopté pour déclarer le succès.

Chaque lecture native réduit une page trop volumineuse au même curseur, puis
rétablit 200 pour le curseur suivant. Les plafonds de 2 Mio/réponse et 100 pages
ne changent pas ; un dépassement retourne une erreur explicite, jamais une
preuve partielle. Une passe réutilise messages/permissions pour une même
session et génération, y compris l’échec ; les doubles lectures terminales
et le contrôle de génération/opération restent indépendants.

## Incidents constatés

Deux reçus 2.2.1 ROLLED_BACK avec update-active-version-unconfirmed :
update-b3326591-8d36-4b49-9251-393167c842c3 et
update-a0d46b78-acf4-4a71-b0f9-5331130c1c71.
PA01 : lecture complète de 6 187 messages, 64 requêtes et 63 curseurs ;
la limite de pagination observée dans le journal n’est pas attribuée à ce RUN.
Sa preuve d’annulation reste à diagnostiquer distinctement avant de déclarer
sa résolution. Les protections restent intactes.
