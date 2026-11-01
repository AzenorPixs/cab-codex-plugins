# Fermer les refus déterministes avant admission

Le broker ne doit pas laisser une demande `PENDING` quand le contrôleur a
explicitement refusé son admission avec un diagnostic HTTP fermé. La clôture
`NOT_ADMITTED` conserve l’erreur, ne constitue aucune décision humaine et
permet au pilote de préparer une nouvelle demande après relecture des
révisions.
