# Conception

Les valeurs personnalisées sont enregistrées par groupe dans la configuration
`interface`. Le catalogue serveur décrit les types, limites et références.
Une écriture administrateur protégée par CSRF modifie uniquement les valeurs
demandées ou réinitialise un seul groupe. La même transaction actualise la
projection Electric. Les écritures historiques conservent les nouveaux champs.

Le fournisseur d’apparence traduit les valeurs enregistrées en propriétés CSS
et seuils réactifs. En l’absence de personnalisation, les valeurs responsives
et les styles actuels restent la référence. Les propriétés de police et de
mise en page utilisent les facteurs partagés et par page existants.
Les tailles de pagination restent distinctes pour Binaires, Sessions,
Archives et Incidents. Les hauteurs configurables restent des minimums ;
les éléments longs et les commandes peuvent occuper davantage de place.
