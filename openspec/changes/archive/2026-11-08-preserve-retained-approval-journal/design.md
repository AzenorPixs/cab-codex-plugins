# Conception

Les événements sont sélectionnés en fonction des approbations effectivement
retirées, après attribution par projet et RUN ; un identifiant partagé avec
une approbation conservée protège ses événements. Les événements des autres
approbations, le chaînage recalculé et les sessions étrangères restent valides.

Si une version précédente a déjà retiré des événements, le magasin peut
permettre de recréer des marqueurs de cohérence sans rejouer la décision. Ces
marqueurs portent explicitement leur origine reconstruite et ne prétendent pas
restituer les octets, horodatages ou détails initiaux. La portée et les seules
divergences autorisées sont attestées avant écriture. Le même reçu reste utilisé.
