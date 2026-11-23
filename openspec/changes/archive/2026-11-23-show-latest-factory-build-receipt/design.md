# Projection des reçus de construction

Les demandes de la Fabrique restent dans `ProjectArtifactBuild`. Les étapes de construction CICD et CICDF restent dans `GitDeliveryStep`. Le serveur compare la date de demande manuelle à la date enregistrée pour l’étape native. Les étapes natives encore en attente sont ignorées. Une demande manuelle active ou au résultat indéterminé reste visible tant que sa protection est active.

Le détail distingue un identifiant de demande manuelle d’un identifiant de livraison. L’inventaire, la publication et l’installation continuent d’exposer leurs propres états. Le rapprochement lit les reçus existants sans migration.
