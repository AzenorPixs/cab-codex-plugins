# Conception

L’Overview partagé conserve le filtre d’exclusion dans la politique. Le serveur découpe les termes sur les points-virgules, ignore les termes vides et normalise casse et accents avant de comparer des sous-chaînes littérales au libellé affiché. L’onglet Tous conserve le catalogue global.

Le minimum et le maximum de chaque coût sont inclusifs. Zéro désactive la borne. La migration additive conserve les politiques et leurs seuils existants. Elle initialise le filtre à une chaîne vide et les nouvelles bornes à zéro.
