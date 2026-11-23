# Conception

L’API capture le pair Unix réel, remonte du worker au relais CAB vérifié puis conserve son propriétaire kernel (PID, UID, boot, start). Une application parente reconnue et de même UID est enregistrée séparément pour une éventuelle reprise contrôlée. Aucun processus n’est choisi par nom seul.

Le reçu lie cette observation au request_id, au compte CAB et à la version demandée. Les anciens reçus sans observation restent explicitement hors périmètre ; une lecture ne crée aucune autorisation rétroactive. Le stockage final conserve cette observation et sa provenance.

La politique distingue autorisation et disponibilité technique. Elle exige un paquet vérifié, la version configurée correspondante, un demandeur actif non révoqué, la même instance et une frontière sans opérations, baux, maintenance, requêtes en vol ou effets natifs inconnus. Elle ne tue aucun processus. Les contrôles natifs existants consomment ce reçu et le revérifient avant dispatch. Un redémarrage administratif contrôlé peut s’appuyer sur la même autorité mais doit conserver PIDFD, quiescence, reçu durable, absence de rejeu et supervision indépendante. Une autre instance ou un autre UID n’est pas couvert.

native.control.configure accepte cabu_recovery_authorized (booléen). Une modification de ce seul consentement est auditée sans appeler l’API fournisseur ni incrémenter control_generation. Elle ne réactive pas une opération déjà inconnue.

L’autorisation ne prétend pas fournir une API native absente, ni prouver une reconnexion ; celle-ci exige toujours les observations moteur et catalogue.
