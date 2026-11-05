# Retour immédiat du rangement et couleurs RUN

Code non attribué ; attribution ACL ultérieure. Mandat SCM humain avec incrément vers2.1.27 puis CABU et information.

Le rangement archive/delete/restore est enregistré par le serveur, mais le navigateur n’applique sa vue qu’à la cadence suivante ou après Actualiser. La réponse catalogue fournira la projection confirmée ; la page l’appliquera immédiatement, même en mode Manuel, sans reload ni nouveau POST. Les lectures HTTP déjà en vol seront invalidées pour ne pas réintroduire une ligne archivée. En cas de refus, la vue restera intacte ; aucun succès inventé.

Les lignes BLOCKED deviennent bleues, DONE vertes et STOPPED orange. WAITING reste jaune ; sélection et texte restent distincts, UNKNOWN n’hérite pas d’une couleur de statut périmé. Aucun changement d’état métier, d’éligibilité ou de source OpenSpec observée.

Fichiers : moniteur serveur, app.mjs/style.css, tests navigateur Chromium/Firefox et gestion HTTP ; versions communes, cadrages/README/CHANGELOG, OpenSpec et rapports SCM. Pas de dépendance, configuration, template ou redémarrage d’OpenCode ajouté.
