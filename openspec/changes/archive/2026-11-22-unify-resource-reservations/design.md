## Decisions

- L’échéance est calculée côté CAB sur chaque acquisition ou renouvellement. Le compteur commence à un et augmente pour chaque renouvellement distinct accepté. Le délai de rattrapage de 60 secondes commence à la seconde 240.
- Une surveillance à la seconde traite les échéances et les avis. À échéance, une réservation ne peut plus autoriser un usage. La suppression de sa ligne par CAB est indépendante de la restitution effective, qui conserve ses gardes de fin d’opération et de nettoyage.
- Le renouvellement est une demande du propriétaire de la réservation encore utilisée. Un RUN en attente sans utilisation ne maintient pas un bail. Les sessions libèrent leurs ressources dès la fin d’usage.
- L’identité de l’ancien bail ne peut pas transférer de droit à une acquisition neuve. Les avis sont durables avec remise native à la session exacte lorsqu’elle est encore active et joignable.
- La page emploie une Shape Electric filtrée par accès au projet. Un ID de réservation autorisé identifie le chemin d’aperçu. Le serveur vérifie les droits, le bail en écriture et la révision du contenu lors de l’enregistrement.
- Le déploiement est additif. En cas de restauration de la version applicative précédente, conserver le schéma et les preuves des opérations, puis réconcilier les réservations avant de reprendre les écritures.
