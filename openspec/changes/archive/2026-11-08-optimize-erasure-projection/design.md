# Conception

Le calcul de rétention évite la création d’un ensemble pour chaque objet qui
ne peut pas être retenu. La projection mémorise séparément le résultat des
prédicats pour chaque sous-arbre, sans réutiliser le résultat d’un autre
prédicat. Ces caches restent locaux à l’appel et ne persistent aucune donnée.

Sur le reçu C08, un prévol en lecture seule a comparé les périmètres avant et
après : empreintes identiques, 24,8 secondes contre 0,7 seconde pour cette
étape. La projection du registre public produisait le même résultat et
conservait sept RUN pairs, en 1,37 seconde contre 12 millisecondes. Le plan
complet optimisé a été mesuré à environ 2,3 secondes en lecture seule, contre
77 secondes avant optimisation ; ces mesures ne prouvent pas la durée d’une
bascule réelle.
