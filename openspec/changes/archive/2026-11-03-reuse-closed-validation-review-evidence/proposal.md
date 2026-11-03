# Réutiliser les revues de validations closes — CAB2.2.6

## Why
PA01 a restauré son PENDING sous2.2.5, décidé et observé PASS. Son transcript
contient aussi deux shells aborted déjà couverts par un reçu de revue DONE.
La garde terminale globale les refuse encore et ne réutilise pas cette preuve.

## What Changes
Réutiliser seulement les preuves historiques cancel-reviewed-validation
DONE du même RUN/contexte/propriétaire et opération CANCELLED sans native,
avec completionDigest identique. Recontrôler les calls et wrappers exacts.
Aucune possibilité pour l’appelant d’ignorer des calls par une simple liste.

Ajouter le retrait propriétaire d’une validation approved jamais émise,
sans revue READ_ONLY fictive pour la commande future et sans résultat natif.

## Impact
Preuves et coordonnateur de recovery, contrôleur, tests et documentation.
Aucun nouveau paquet ou schéma. Mandat utilisateur SCM, incrément, publication
et CABU ; aucune écriture manuelle dans les RUN Pixs.
