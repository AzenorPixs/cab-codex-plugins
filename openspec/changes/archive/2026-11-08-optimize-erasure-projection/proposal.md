# Accélérer la projection de nettoyage

## Pourquoi

La projection C08 a maintenu les services indisponibles pendant plus d’une
minute. Le calcul répétait la construction d’ensembles et les parcours de
sous-arbres sur plus d’un million de valeurs.

## Changements

Construire les ensembles seulement pour les objets concernés et mémoriser les
parcours dans une projection. Conserver les résultats et les protections des
RUN pairs. Mesurer sur l’inventaire réel en lecture seule, puis livrer le
correctif ; la reprise réelle reste une opération distincte.
