# Conception et sécurité

La pagination reste limitée à cent pages et deux Mio par réponse. La première page fixe order=asc ; les suivantes envoient le curseur seul avec les autres paramètres nécessaires. Aucun curseur n’est reconstruit.

La normalisation place nativeSingleExchange=false indépendamment des métadonnées entrantes. Après lecture de tout le transcript, elle ne marque qu’un unique assistant corrélé à un unique utilisateur antérieur dans la même session. Le vérificateur admet le modèle/variante de l’assistant natif uniquement si le parent ne déclare aucun modèle ni variante, si l’échange a cette provenance interne et si les identités, dates, fin stop, texte et absence d’outil sont prouvés. Une déclaration partielle ou contradictoire reste refusée ; aucune métadonnée utilisateur n’est ajoutée. La preuve persistée conserve son schéma et les jobs historiques restent lisibles.

La phase opérationnelle conserve les ressources dédiées au test et traite une seule commande true par décision CAB et permission once. Toute divergence arrête l’effet concerné sans rejouer une décision consommée. L’activation utilise l’updater transactionnel, sans toucher au choix des jobs existants.

La concordance du modèle et de la variante actuellement exposés par la session reste exigée. La branche native unique exige cette identité complète en plus de la preuve assistant ; une configuration de session divergente ne peut pas être ignorée.
