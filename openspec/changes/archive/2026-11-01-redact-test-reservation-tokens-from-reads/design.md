# Conception

Conserver `testReservations(runId)` comme vue interne afin que les invariants,
les règles FIFO, la restitution et la réconciliation utilisent toujours le
jeton courant. Ajouter une projection publique qui clone chaque entrée et
retire uniquement `token`. Utiliser cette projection dans les réponses GET
spécifiques et les statuts RUN ; copier le snapshot global puis masquer les
jetons de ses seules réservations de test, sans altérer l'état persistant.

Les réponses POST d'acquisition et de réconciliation gardent leur contrat et
leurs tests ; aucune réservation active n'est modifiée par une lecture. Les
tests vérifient que projections GET et snapshots n'exposent pas le jeton alors
que l'acquisition le remet au demandeur.
