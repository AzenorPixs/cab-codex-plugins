# Respecter0600 lors des écritures privées — CAB2.2.9

## Why
Après migration2.2.8, les répertoires sont0700 mais les écritures de job et
superviseur héritent de l’umask0002 et recréent quelques fichiers0664.
La spécification exige0600. Les sessions restent opérationnelles.

## What Changes
Umask0077 à l’entrée du contrôleur et du superviseur ;le verrou public
projet reste explicitement0775. Aucun mandat ou effet natif changé.
Correction SCM, incrément, publication et CABU déjà mandatés.

## Impact
Deux entrées runtime et leurs versions, test effectif job/verrou public.

## Frontière PENDING reprise
Le retour PA01 révèle une permission corrélée mais sans accès après la
restauration puis une renotification PENDING. La renotification remplaçait
l’objet et ses marqueurs de reprise. Préserver l’objet identique et marquer la
restauration comme telle permet au contrôleur d’acquérir par la voie normale
après décision, sans nouvelle demande ni réponse native par le correcteur.
