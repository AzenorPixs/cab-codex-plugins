# Conception

La méthode `replyPermission` valide déjà que le répertoire cible est absolu.
Elle transmettra cette même valeur au helper HTTP sous `locationDirectory`,
qui produit l’en-tête de scope V2 `x-opencode-directory`. Le contrôleur garde
ainsi une portée explicite jusqu’à l’endpoint de réponse.

Le test utilise une location par défaut et une location de session différentes
et vérifie l’en-tête porté par le POST. Aucun fallback, nouvelle tentative,
mutation de permission, nouvelle dépendance ou changement de protocole n’est
ajouté.
