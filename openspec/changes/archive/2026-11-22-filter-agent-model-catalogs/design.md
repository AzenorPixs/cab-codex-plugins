# Conception

Le tableau commun filtre et trie toutes les lignes disponibles avant de découper les pages. L’onglet Tous conserve le catalogue global. Les sélections des politiques sont évaluées par le serveur sur les métadonnées en vigueur. Aucune copie du catalogue n’est enregistrée par politique.

Les politiques PostgreSQL conservent des seuils décimaux et des valeurs de curseur validés. Le coût de base inconnu reste distinct de zéro. Les mesures inconnues sont écartées lorsqu’une borne est active. Le marqueur free dans le nom ou l’identifiant et les deux tarifs de base connus à zéro définissent le groupe Free. Payant désigne le reste du catalogue.

Les prix de cache utilisent les données du fournisseur puis l’enrichissement existant. Une écriture avec plusieurs durées utilise le prix de la durée la plus courte et indique cette durée. Une projection de lecture couvre les fiches importées avant la migration. Le téléchargement du catalogue et le chiffrement des clés restent sur leurs parcours existants. La suppression d’un fournisseur protège ses clés et retire ses modèles; le rafraîchissement concurrent vérifie que le fournisseur existe toujours.

La migration additive ne crée que la table des politiques. Un retour du code peut la conserver; inverser la migration supprime les politiques.
