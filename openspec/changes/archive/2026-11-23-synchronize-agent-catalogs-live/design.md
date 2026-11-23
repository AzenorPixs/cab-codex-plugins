# Conception

Une projection PostgreSQL réservée aux administrateurs alimente les tableaux via Electric. Les clés chiffrées et les JSON téléchargés restent dans leurs stockages privés. Le premier rendu peut lire la même projection dans PostgreSQL.

Le worker compare les SHA-256 de tous les fichiers locaux, y compris la complétion, à leurs empreintes enregistrées avant d’appliquer un recalcul. Il conserve les modèles précédemment valides en cas d’absence ou d’échec de téléchargement. Un téléchargement identique actualise seulement l’état du fichier et l’horodatage. Le rafraîchissement planifié et la demande manuelle empruntent le même worker et le même contrôle de contenu. Le téléchargement met en place les octets validés par remplacement atomique.

La migration ajoute des tables de suivi et de projection. Un retour du code peut conserver ces tables et les fichiers. L’inversion de la migration retire la configuration et le suivi des nouveaux fichiers.
