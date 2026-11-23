## Stockage et compatibilité
Le modèle Incident conserve ses champs et identifiants ; une migration AlterModelTable déplace sa table de cab_core_incident vers ccab. Les commandes CCAB continuent d’utiliser le même modèle. Les claims, preuves, résolutions, dates et relations projet/RUN restent conservés.

## Affichage
Une route de consultation paginée propre au projet fournit les déclarations avec date, projet et RUN. L’endpoint CCAB historique et son snapshot_digest restent inchangés. Le tableau réutilise les styles responsives des sessions ; l’identifiant ouvre une fenêtre de consultation structurée et un JSON complet. L’interface réactualise la liste périodiquement sans modifier les incidents.

## Coordination
Les fichiers propres au tableau et les spécifications sont réservés au RUN. Les fichiers partagés suivent les réservations CAB ; la migration et le redémarrage attendent une frontière sûre confirmée avec Dev DCAB et CCAB. Les livraisons du tableau et de CABU restent distinctes.
